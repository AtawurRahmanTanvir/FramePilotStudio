# FPSTUDIO-ORIGINAL-SOURCE
# Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
from __future__ import annotations
import gc, os, tempfile
from pathlib import Path
from typing import Callable
import json
from framepilot.alignment_engine import load_mapping, build_master_rows, write_master_csv
from framepilot.media_engine import check_cancelled, normalize_audio_for_asr
from framepilot.csv_engine import validate_master_csv, write_qa_report
from framepilot.runtime_manifest import load_runtime_manifest, validate_model_entries

Progress = Callable[[float,str],None]


def _load_model_manifest(runtime_root: Path) -> dict:
    try:
        return load_runtime_manifest(runtime_root)
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


def generate_final_master_csv(audio_path: str, mapping_path: str, output_path: str,
                              model_name: str = 'medium', compute_type: str = 'int8',
                              device: str = 'cpu', model_dir: str | None = None,
                              threads: int = 4, batch_size: int = 4,
                              progress: Progress | None = None) -> tuple[Path,dict]:
    import time
    def report(pct, msg):
        if progress: progress(float(pct), str(msg))
    def callback_for(start: float, span: float, label: str):
        last = {'pct': -1, 'time': 0.0}
        def callback(value):
            check_cancelled()
            now = time.monotonic()
            pct = max(0.0, min(100.0, float(value)))
            rounded = int(pct)
            if rounded != last['pct'] or now - last['time'] >= 0.5:
                last['pct'] = rounded; last['time'] = now
                report(start + (pct / 100.0) * span, f'{label}: {rounded}%')
        return callback

    audio = Path(audio_path).expanduser().resolve()
    mapping_file = Path(mapping_path).expanduser().resolve()
    target_path = Path(output_path).expanduser().resolve()
    qa_path = target_path.with_suffix('.QA.txt')
    if not audio.is_file(): raise FileNotFoundError(f'Audio not found: {audio}')
    if not mapping_file.is_file(): raise FileNotFoundError(f'Visual Mapping CSV not found: {mapping_file}')
    for reserved in (target_path, qa_path):
        if reserved.exists():
            raise FileExistsError(f'Refusing to overwrite an existing output file: {reserved}')
    mapping = load_mapping(mapping_file)
    runtime_root = Path(os.environ.get('FRAMEPILOT_RUNTIME_ROOT') or Path(__file__).resolve().parents[2]/'runtime').resolve()
    models = Path(model_dir).expanduser().resolve() if model_dir else runtime_root/'models'
    if not models.is_dir():
        raise FileNotFoundError(f'Offline model directory not found: {models}. Install the selected WhisperX ASR and language alignment models in the app model pack.')
    manifest = _load_model_manifest(runtime_root)
    asr_valid, align_valid = validate_model_entries(runtime_root, manifest)
    asr_entries = [entry for entry, _path in asr_valid]
    align_entries = [entry for entry, _path in align_valid]
    asr_pair = next(((entry, path) for entry, path in asr_valid if str(entry.get('name') or entry.get('id') or entry.get('model')) == str(model_name)), None)
    if not asr_pair:
        available = ', '.join(str(item.get('name') or item.get('id') or item.get('model')) for item in asr_entries) or 'none'
        raise RuntimeError(f'ASR model "{model_name}" is not registered in the offline model pack. Available models: {available}.')
    asr_entry, asr_model_path = asr_pair
    vad_entry = manifest.get('whisperx', {}).get('vad') or {}
    vad_relative = str(vad_entry.get('path') or '')
    vad_model_path = (runtime_root / vad_relative).resolve()
    if not vad_relative or runtime_root not in vad_model_path.parents or not vad_model_path.is_file():
        raise FileNotFoundError(
            f"The registered local VAD model is missing: {vad_model_path}. "
            'Install the declared pyannote segmentation model before running Audio-to-CSV.'
        )
    try:
        # Strict offline mode: no hidden model or tokenizer download is permitted.
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
        import whisperx
    except Exception as exc:
        raise RuntimeError('WhisperX runtime is not bundled in this development build. The private offline engine package is incomplete.') from exc
    try:
        import torch
    except Exception as exc:
        raise RuntimeError(f'PyTorch runtime is unavailable inside the bundled engine: {exc}') from exc
    if device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA was selected but a compatible CUDA runtime/device is unavailable. Choose CPU · INT8.')
    if device == 'cpu': torch.set_num_threads(max(1, min(int(threads), 32)))

    check_cancelled()
    report(2, 'Checking the selected audio and Visual Mapping CSV')
    from tempfile import TemporaryDirectory
    with TemporaryDirectory(prefix='framepilot-audio-') as temporary_dir:
        wav_path = Path(temporary_dir) / 'voiceover_16k_mono.wav'
        report(3, 'Preparing audio with the local FFmpeg engine')
        media_info = normalize_audio_for_asr(audio, wav_path, lambda pct, msg: report(3 + (float(pct) / 100.0) * 7, msg))
        check_cancelled()
        report(10, 'Loading the selected offline WhisperX model')
        from whisperx.vads.pyannote import Pyannote
        vad = Pyannote(device, model_fp=str(vad_model_path), vad_onset=0.5)
        asr = whisperx.load_model(
            str(asr_model_path), device, compute_type=compute_type,
            download_root=str(models), local_files_only=True,
            threads=max(1, int(threads)), vad_model=vad,
        )
        check_cancelled()
        report(14, 'Decoding audio and detecting speech')
        audio_data = whisperx.load_audio(str(wav_path))
        duration = len(audio_data) / 16000.0
        result = asr.transcribe(audio_data, batch_size=max(1, int(batch_size)), print_progress=False,
                                progress_callback=callback_for(15, 36, 'Speech recognition'))
        check_cancelled()
        language = result.get('language')
        if not language: raise RuntimeError('WhisperX could not identify the speech language in this audio.')
        if not result.get('segments'): raise RuntimeError('No speech segments were recognized in the selected audio.')
        del asr; gc.collect()
        if device == 'cuda': torch.cuda.empty_cache()
        report(54, f'Loading the offline word aligner for detected language: {language}')
        align_pair = next(((entry, path) for entry, path in align_valid if str(entry.get('language', '')).casefold() == str(language).casefold()), None)
        align_entry, align_model_path = align_pair if align_pair else (None, None)
        if not align_entry:
            supported = ', '.join(str(item.get('language')) for item in align_entries if item.get('language')) or 'none'
            raise RuntimeError(f'No offline word aligner is registered for detected language "{language}". Languages in this runtime pack: {supported}.')
        align_loader = str(align_entry.get('loader', 'huggingface')).casefold()
        if align_loader == 'torchaudio':
            align_model_name = str(align_entry.get('model_name') or '').strip()
            if not align_model_name:
                raise RuntimeError(f'The torchaudio alignment entry for "{language}" must declare model_name.')
            # Torchaudio resolves the named pipeline weights from its model_dir.
            # The build process pre-stages the official checkpoint in this folder.
            try:
                model_a, metadata = whisperx.load_align_model(language_code=language, device=device,
                    model_name=align_model_name, model_dir=str(align_model_path), model_cache_only=True)
            except Exception as exc:
                raise RuntimeError(f'Could not load the offline torchaudio aligner for "{language}" from {align_model_path}. Original error: {exc}') from exc
        elif align_loader == 'huggingface':
            try:
                model_a, metadata = whisperx.load_align_model(language_code=language, device=device,
                    model_name=str(align_model_path), model_dir=str(models), model_cache_only=True)
            except Exception as exc:
                raise RuntimeError(f'Could not load the offline Hugging Face aligner for "{language}" from {align_model_path}. Original error: {exc}') from exc
        else:
            raise RuntimeError(f'Unsupported offline aligner loader "{align_loader}" for language "{language}".')
        report(63, 'Aligning recognized words to the audio waveform')
        aligned = whisperx.align(result['segments'], model_a, metadata, audio_data, device,
                                 return_char_alignments=False, print_progress=False,
                                 progress_callback=callback_for(64, 20, 'Word-level alignment'))
        check_cancelled()
        del model_a; gc.collect()
        if device == 'cuda': torch.cuda.empty_cache()
        word_segments = aligned.get('word_segments') or [w for seg in aligned.get('segments', []) for w in seg.get('words', [])]
        if not word_segments:
            raise RuntimeError(f'WhisperX did not produce word-level timestamps for language {language}. No estimated timestamps will be substituted.')
        report(86, 'Matching verified mapping phrases to the aligned transcript')
        rows = build_master_rows(mapping, word_segments, duration, progress=lambda pct, msg: report(86 + (float(pct) / 100.0) * 7, msg))
        report(94, 'Writing and validating the 21-column Final Master CSV')
        target_created = False
        try:
            target = write_master_csv(rows, target_path)
            target_created = True
            qa = validate_master_csv(target)
            if not qa.get('can_continue'):
                raise RuntimeError('The generated CSV failed the structural QA gate. ' + '; '.join(qa.get('issues', [])))
            qa_path = write_qa_report(target, qa)
        except Exception:
            if target_created:
                target_path.unlink(missing_ok=True)
            raise
        statuses = {}
        for row in rows: statuses[row['Alignment_Status']] = statuses.get(row['Alignment_Status'], 0) + 1
        summary = {'output': str(target), 'rows': len(rows), 'columns': 21, 'language': language,
                   'audio_duration_seconds': round(duration, 3), 'statuses': statuses,
                   'models_directory': str(models), 'media_info': media_info,
                   'qa_report': str(qa_path), 'timestamps_are_estimated': False}
    report(100, 'Final Master CSV created and QA completed')
    return target, summary
