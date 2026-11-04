from __future__ import annotations

import argparse
import csv
import difflib
import json
import math
import os
import re
import sys
import tempfile
import time
import unicodedata
import zipfile
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve()
PROJECT_ROOT = HERE.parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

CSV_HEADERS = ["Word_Index", "Script_Word", "Recognized_Word", "Start_ms", "End_ms"]


def emit(event: str, **payload: Any) -> None:
    print(json.dumps({"event": event, **payload}, ensure_ascii=False), flush=True)


def normalize_token(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).casefold()
    chars = []
    for char in value:
        category = unicodedata.category(char)
        if category[0] in {"L", "N", "M"}:
            chars.append(char)
    return "".join(chars)


def tokenize_script(text: str) -> list[str]:
    # Keep punctuation attached to the word for display; normalize separately for matching.
    return [part for part in re.findall(r"\S+", text, flags=re.UNICODE) if part.strip()]


def read_script(path: Path) -> str:
    suffix = path.suffix.casefold()
    if suffix in {".txt", ".md", ".markdown"}:
        return path.read_text(encoding="utf-8-sig")
    if suffix == ".docx":
        with zipfile.ZipFile(path) as archive:
            data = archive.read("word/document.xml")
        import xml.etree.ElementTree as ET
        root = ET.fromstring(data)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        for paragraph in root.findall(".//w:p", ns):
            chunks = [node.text or "" for node in paragraph.findall(".//w:t", ns)]
            if chunks:
                paragraphs.append("".join(chunks))
        return "\n".join(paragraphs)
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF script reading requires pypdf in the Motion Python runtime. Use TXT, MD or DOCX for now, or ask Copilot to bundle pypdf.") from exc
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    raise ValueError("Supported script formats: TXT, MD, DOCX and PDF.")


def model_entries(runtime_root: Path) -> tuple[dict, list, list]:
    from framepilot.runtime_manifest import load_runtime_manifest, validate_model_entries

    manifest = load_runtime_manifest(runtime_root)
    asr_valid, align_valid = validate_model_entries(runtime_root, manifest)
    return manifest, asr_valid, align_valid


def load_asr_and_alignment(runtime_root: Path, language_hint: str | None, model_name: str | None):
    import whisperx
    import torch
    from whisperx.vads.pyannote import Pyannote

    manifest, asr_valid, align_valid = model_entries(runtime_root)
    if not asr_valid:
        raise RuntimeError("No verified offline ASR model is registered in runtime/manifests/runtime-manifest.json.")
    chosen = None
    if model_name:
        chosen = next((item for item in asr_valid if str(item[0].get("name") or item[0].get("id") or item[0].get("model")) == model_name), None)
        if chosen is None:
            available = ', '.join(str(item[0].get("name") or item[0].get("id") or item[0].get("model")) for item in asr_valid)
            raise RuntimeError(f"Requested ASR model '{model_name}' is not installed in the offline runtime. Available: {available}.")
    if chosen is None:
        chosen = next((item for item in asr_valid if item[0].get("default")), asr_valid[0])
    asr_entry, asr_path = chosen
    vad_entry = (manifest.get("whisperx") or {}).get("vad") or {}
    vad_rel = str(vad_entry.get("path") or "")
    vad_path = (runtime_root / vad_rel).resolve()
    if not vad_rel or runtime_root.resolve() not in vad_path.parents or not vad_path.is_file():
        raise RuntimeError(f"Verified local VAD model is missing: {vad_path}")

    device = "cpu"
    compute_type = "int8"
    torch.set_num_threads(max(1, min(os.cpu_count() or 4, 8)))
    vad = Pyannote(device, model_fp=str(vad_path), vad_onset=0.5)
    asr = whisperx.load_model(
        str(asr_path), device, compute_type=compute_type,
        download_root=str(runtime_root / "models"), local_files_only=True,
        vad_model=vad,
    )
    return whisperx, asr, align_valid, asr_entry


def align_audio(audio_path: Path, runtime_root: Path, model_name: str | None) -> tuple[list[dict], str, float, str]:
    from framepilot.media_engine import normalize_audio_for_asr

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

    emit("progress", percent=3, message="Validating the voiceover and local runtime")
    start = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="framepilot-motion-audio-") as tmp:
        wav = Path(tmp) / "voiceover_16k_mono.wav"
        emit("progress", percent=8, message="Preparing voiceover audio")
        media = normalize_audio_for_asr(audio_path, wav, lambda pct, msg: emit("progress", percent=8 + float(pct) * 0.07, message=msg))
        emit("progress", percent=16, message="Loading the local speech recognition model")
        whisperx, asr, align_valid, asr_entry = load_asr_and_alignment(runtime_root, None, model_name)
        audio = whisperx.load_audio(str(wav))
        duration = len(audio) / 16000.0
        emit("progress", percent=22, message="Recognizing the actual spoken words")
        result = asr.transcribe(audio, batch_size=4, print_progress=False)
        language = str(result.get("language") or "").strip()
        if not language:
            raise RuntimeError("Speech recognition did not return a detected language.")
        if not result.get("segments"):
            raise RuntimeError("No speech was recognized in the selected voiceover.")

        pair = next((item for item in align_valid if str(item[0].get("language", "")).casefold() == language.casefold()), None)
        if pair is None:
            supported = sorted({str(item[0].get("language")) for item in align_valid if item[0].get("language")})
            raise RuntimeError(
                f"No verified offline word aligner is registered for language '{language}'. "
                f"Languages present in the runtime model pack: {', '.join(supported) or 'none'}. "
                "Motion Studio will not invent word timestamps."
            )
        align_entry, align_path = pair
        emit("progress", percent=58, message=f"Loading verified {language} word aligner")
        loader = str(align_entry.get("loader", "huggingface")).casefold()
        if loader == "torchaudio":
            model_name_for_aligner = str(align_entry.get("model_name") or "").strip()
            if not model_name_for_aligner:
                raise RuntimeError(f"The {language} torchaudio aligner has no model_name in the runtime manifest.")
            model_a, metadata = whisperx.load_align_model(
                language_code=language, device="cpu", model_name=model_name_for_aligner,
                model_dir=str(align_path), model_cache_only=True,
            )
        elif loader == "huggingface":
            model_a, metadata = whisperx.load_align_model(
                language_code=language, device="cpu", model_name=str(align_path),
                model_dir=str(runtime_root / "models"), model_cache_only=True,
            )
        else:
            raise RuntimeError(f"Unsupported aligner loader '{loader}' for {language}.")
        emit("progress", percent=66, message="Aligning each recognized word to the waveform")
        aligned = whisperx.align(
            result["segments"], model_a, metadata, audio, "cpu",
            return_char_alignments=False, print_progress=False,
        )
        word_segments = aligned.get("word_segments") or [word for seg in aligned.get("segments", []) for word in seg.get("words", [])]
        words = []
        for item in word_segments:
            token = str(item.get("word") or "").strip()
            begin, end = item.get("start"), item.get("end")
            if not token or not normalize_token(token) or not isinstance(begin, (int, float)) or not isinstance(end, (int, float)):
                continue
            if not math.isfinite(float(begin)) or not math.isfinite(float(end)) or float(begin) < 0 or float(end) <= float(begin):
                continue
            if float(end) > duration + 0.05:
                continue
            words.append({"word": token, "start": float(begin), "end": float(end), "score": item.get("score")})
        if not words:
            raise RuntimeError("The aligner returned no valid word-level timestamps. No CSV was written.")
        words.sort(key=lambda x: (x["start"], x["end"]))
        for left, right in zip(words, words[1:]):
            if right["start"] < left["start"]:
                raise RuntimeError("Aligned word times are not chronological. No CSV was written.")
        emit("progress", percent=82, message="Comparing recognized words with the approved script")
        return words, language, duration, str(asr_entry.get("name") or asr_entry.get("id") or asr_entry.get("model") or "unknown")


def align_script_to_recognition(script_words: list[str], audio_words: list[dict]) -> tuple[list[dict], dict]:
    expected = [normalize_token(word) for word in script_words]
    actual = [normalize_token(item["word"]) for item in audio_words]
    matcher = difflib.SequenceMatcher(a=expected, b=actual, autojunk=False)
    rows: list[dict] = []
    matched = missing = extra = replacements = 0

    def append(script_word: str, audio_item: dict | None, status: str) -> None:
        nonlocal matched, missing, extra, replacements
        rows.append({
            "Script_Word": script_word,
            "Recognized_Word": audio_item["word"] if audio_item else "",
            "Start_ms": str(round(audio_item["start"] * 1000)) if audio_item else "",
            "End_ms": str(round(audio_item["end"] * 1000)) if audio_item else "",
            "_status": status,
            "_score": audio_item.get("score") if audio_item else None,
        })
        if status == "MATCH": matched += 1
        elif status == "MISSING_IN_AUDIO": missing += 1
        elif status == "EXTRA_IN_AUDIO": extra += 1
        elif status == "SCRIPT_AUDIO_MISMATCH": replacements += 1

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        left = script_words[i1:i2]
        right = audio_words[j1:j2]
        if tag == "equal":
            for script_word, audio_item in zip(left, right):
                append(script_word, audio_item, "MATCH")
        elif tag == "delete":
            for script_word in left:
                append(script_word, None, "MISSING_IN_AUDIO")
        elif tag == "insert":
            for audio_item in right:
                append("", audio_item, "EXTRA_IN_AUDIO")
        elif tag == "replace":
            common = min(len(left), len(right))
            for idx in range(common):
                append(left[idx], right[idx], "SCRIPT_AUDIO_MISMATCH")
            for script_word in left[common:]:
                append(script_word, None, "MISSING_IN_AUDIO")
            for audio_item in right[common:]:
                append("", audio_item, "EXTRA_IN_AUDIO")

    for index, row in enumerate(rows, start=1):
        row["Word_Index"] = str(index)
    report = {
        "script_words": len(script_words),
        "recognized_words": len(audio_words),
        "rows": len(rows),
        "matched_words": matched,
        "missing_script_words": missing,
        "extra_recognized_words": extra,
        "script_audio_mismatches": replacements,
        "alignment_review_required": bool(missing or extra or replacements),
    }
    return rows, report


def write_outputs(rows: list[dict], output_csv: Path, metadata: dict) -> tuple[Path, Path]:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    qa_path = output_csv.with_suffix(".QA.json")
    for path in (output_csv, qa_path):
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite an existing Motion output: {path}")
    temp_csv = output_csv.with_suffix(output_csv.suffix + ".tmp")
    temp_qa = qa_path.with_suffix(qa_path.suffix + ".tmp")
    try:
        with temp_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=CSV_HEADERS, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        temp_qa.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_csv.replace(output_csv)
        temp_qa.replace(qa_path)
    except Exception:
        temp_csv.unlink(missing_ok=True)
        temp_qa.unlink(missing_ok=True)
        output_csv.unlink(missing_ok=True)
        qa_path.unlink(missing_ok=True)
        raise
    return output_csv, qa_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--runtime-root", required=True)
    parser.add_argument("--backend-root", required=True)
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    script_path = Path(args.script).expanduser().resolve()
    audio_path = Path(args.audio).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    runtime_root = Path(args.runtime_root).expanduser().resolve()
    backend_root = Path(args.backend_root).expanduser().resolve()
    sys.path.insert(0, str(backend_root))

    try:
        if not script_path.is_file() or not audio_path.is_file():
            raise FileNotFoundError("The selected script or voiceover no longer exists.")
        script = read_script(script_path)
        script_words = tokenize_script(script)
        if not script_words:
            raise ValueError("The selected script contains no readable words.")
        emit("progress", percent=1, message=f"Loaded {len(script_words):,} script words")
        audio_words, language, duration, model_id = align_audio(audio_path, runtime_root, args.model)
        rows, comparison = align_script_to_recognition(script_words, audio_words)
        low_confidence = []
        confidence_unavailable = 0
        for row in rows:
            score = row.get("_score")
            if isinstance(score, (int, float)) and math.isfinite(float(score)):
                if float(score) < 0.45:
                    low_confidence.append({"word_index": row["Word_Index"], "recognized_word": row["Recognized_Word"], "score": float(score)})
            elif row.get("Recognized_Word"):
                confidence_unavailable += 1
        for row in rows:
            row.pop("_status", None)
            row.pop("_score", None)
        metadata = {
            "schema_version": 1,
            "source_script": script_path.name,
            "source_audio": audio_path.name,
            "detected_language": language,
            "asr_model": model_id,
            "audio_duration_seconds": round(duration, 3),
            **comparison,
            "low_confidence_words": low_confidence,
            "confidence_unavailable_count": confidence_unavailable,
            "timestamp_source": "WhisperX forced alignment; no estimated timestamps substituted",
            "warnings": [],
        }
        if comparison["alignment_review_required"]:
            metadata["warnings"].append("Script/audio differences were found. Review the companion QA report before using the timing CSV.")
        if low_confidence:
            metadata["warnings"].append(f"{len(low_confidence)} low-confidence aligned word(s) need review.")
        if confidence_unavailable:
            metadata["warnings"].append(f"Alignment confidence was not provided for {confidence_unavailable} recognized word(s).")
        csv_path, qa_path = write_outputs(rows, output_path, metadata)
        emit("progress", percent=100, message="Motion word timing and script verification completed")
        emit("result", csv_output=str(csv_path), qa_output=str(qa_path), summary=metadata)
        return 0
    except Exception as exc:
        emit("error", message=str(exc), detail=type(exc).__name__)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
