# FPSTUDIO-ORIGINAL-SOURCE
# Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
from __future__ import annotations
import csv, difflib, math, re
from typing import Callable
from pathlib import Path
from typing import Any, Iterable

OUTPUT_COLUMNS = [
    "Marker_Index", "Marker_Name", "Company", "Image_No", "Image_File",
    "Marker_Time_Seconds", "Marker_Elapsed_HHMMSS_mmm", "Voiceover_Start_Seconds",
    "Voiceover_End_Seconds", "Image_Hold_End_Seconds", "Image_Hold_Duration_Seconds",
    "Expected_Voiceover_Span", "Detected_ASR_Text", "First_ASR_Word", "Last_ASR_Word",
    "Average_ASR_Confidence", "Original_Estimated_Start_Seconds", "Original_Estimated_End_Seconds",
    "Speech_Start_Drift_vs_Estimate_Seconds", "Alignment_Status", "Alignment_Notes"
]
TOKEN_RE = re.compile(r"[\w]+(?:['’][\w]+)?", re.UNICODE)
NUMBER_WORDS = {
    'first':'1st','second':'2nd','third':'3rd','fourth':'4th','fifth':'5th','sixth':'6th','seventh':'7th','eighth':'8th','ninth':'9th','tenth':'10th','eleventh':'11th','twelfth':'12th','thirteenth':'13th','fourteenth':'14th','fifteenth':'15th','sixteenth':'16th','seventeenth':'17th','eighteenth':'18th','nineteenth':'19th','twentieth':'20th','thirtieth':'30th','fortieth':'40th','fiftieth':'50th','sixtieth':'60th','seventieth':'70th','eightieth':'80th','ninetieth':'90th',
    'zero':'0','one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10',
    'eleven':'11','twelve':'12','thirteen':'13','fourteen':'14','fifteen':'15','sixteen':'16','seventeen':'17','eighteen':'18','nineteen':'19','twenty':'20',
    'thirty':'30','forty':'40','fifty':'50','sixty':'60','seventy':'70','eighty':'80','ninety':'90','hundred':'100','thousand':'1000'
}

def tokenize(text: str) -> list[str]:
    tokens = [m.group(0).casefold().replace('’', "'") for m in TOKEN_RE.finditer(text or '')]
    return [NUMBER_WORDS.get(t, t) for t in tokens]

def parse_estimate(value: str | None) -> float | None:
    if value is None or str(value).strip() == '': return None
    raw = str(value).strip()
    try:
        if re.fullmatch(r"\d+(?:\.\d+)?", raw): return float(raw)
        parts = raw.split(':')
        if len(parts) == 2: return int(parts[0]) * 60 + float(parts[1])
        if len(parts) == 3: return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError: return None
    return None

def fmt_seconds(value: float | None) -> str:
    if value is None or not math.isfinite(value): return ''
    return f"{value:.3f}"

def fmt_elapsed(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, rem = divmod(millis, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"

def load_mapping(path: str | Path) -> list[dict[str, str]]:
    p = Path(path).expanduser().resolve()
    if not p.is_file(): raise FileNotFoundError(f"Visual Mapping CSV not found: {p}")
    with p.open('r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        required = {'Company','Image_No','Image_File','Exact_Voiceover_Span','Start_Estimate','End_Estimate'}
        missing = sorted(required - set(reader.fieldnames or []))
        if missing:
            headers = set(reader.fieldnames or [])
            is_final_master = {'Marker_Index', 'Voiceover_Start_Seconds', 'Alignment_Status'}.issubset(headers)
            if is_final_master:
                raise ValueError(
                    'The selected file is a Final Master CSV, not a Visual Mapping CSV. '
                    'Select a mapping file with these columns: Company, Image_No, Image_File, '
                    'Exact_Voiceover_Span, Start_Estimate, End_Estimate.'
                )
            raise ValueError('Visual Mapping CSV missing columns: ' + ', '.join(missing))
        rows = list(reader)
    if not rows: raise ValueError('Visual Mapping CSV contains no image mappings.')
    for i, row in enumerate(rows, 1):
        try: image_no = int(row['Image_No'])
        except ValueError as e: raise ValueError(f'Invalid Image_No on mapping row {i}') from e
        if image_no != i: raise ValueError(f'Image_No sequence must be 001..N; row {i} contains {image_no:03d}.')
        if not (row.get('Exact_Voiceover_Span') or '').strip(): raise ValueError(f'Exact_Voiceover_Span is empty on mapping row {i}.')
    return rows

def _candidate_match(expected: list[str], words: list[dict[str, Any]], cursor: int) -> tuple[int,int,float,list[tuple[int,int]]]:
    n = len(words); m = len(expected)
    if not m: raise ValueError('Mapping row has no matchable tokens.')
    radius = max(3, round(m * 0.55))
    min_len = max(1, m - radius); max_len = min(n, m + radius + 3)
    search_start = max(0, cursor - 2)
    search_end = min(n, cursor + max(60, m * 6))
    best: tuple[float,int,int,list[tuple[int,int]]] | None = None
    for start in range(search_start, search_end):
        if start - cursor > max(60, m * 6): break
        for length in range(min_len, max_len + 1):
            end = start + length
            if end > n: continue
            candidate = [tokenize(str(w.get('word','')))[0] if tokenize(str(w.get('word',''))) else '' for w in words[start:end]]
            matcher = difflib.SequenceMatcher(None, expected, candidate, autojunk=False)
            ratio = matcher.ratio()
            blocks = [(b.a, b.b) for b in matcher.get_matching_blocks() if b.size > 0]
            matched_count = sum(b.size for b in matcher.get_matching_blocks())
            coverage = matched_count / max(1, len(expected))
            # Prefer a strong chronological match with full phrase coverage and modest length variance.
            adjusted = ratio * 0.75 + coverage * 0.25 - min(abs(start-cursor), 120) * 0.00015 - abs(length-m) * 0.001
            if best is None or adjusted > best[0]: best = (adjusted, start, end, blocks)
    if best is None: raise ValueError(f'No transcript window found near word index {cursor}.')
    adjusted, start, end, blocks = best
    # Recompute the public similarity for notes from the selected candidate.
    cand = [tokenize(str(w.get('word','')))[0] if tokenize(str(w.get('word',''))) else '' for w in words[start:end]]
    ratio = difflib.SequenceMatcher(None, expected, cand, autojunk=False).ratio()
    return start, end, ratio, blocks

def build_master_rows(mapping: list[dict[str, str]], word_segments: Iterable[dict[str, Any]], audio_duration: float, progress: Callable[[float, str], None] | None = None) -> list[dict[str, str]]:
    words = [dict(w) for w in word_segments if w.get('word') and isinstance(w.get('start'), (float,int)) and isinstance(w.get('end'), (float,int))]
    if not words: raise ValueError('WhisperX did not return any aligned word timestamps. No CSV was generated.')
    cursor = 0; matched: list[dict[str, Any]] = []
    for idx, row in enumerate(mapping, 1):
        if progress and (idx == 1 or idx % 5 == 0 or idx == len(mapping)):
            progress((idx / len(mapping)) * 100.0, f'Matching image {idx:,}/{len(mapping):,}')
        expected_text = row['Exact_Voiceover_Span']
        expected = tokenize(expected_text)
        start_i, end_i, ratio, _blocks = _candidate_match(expected, words, cursor)
        chosen = words[start_i:end_i]
        if not chosen: raise ValueError(f'No words matched mapping image {idx:03d}.')
        start_time = float(chosen[0]['start']); end_time = float(chosen[-1]['end'])
        if end_time <= start_time: raise ValueError(f'Invalid aligned interval for Image_{idx:03d}.')
        scores = [float(w['score']) for w in chosen if isinstance(w.get('score'), (float,int)) and math.isfinite(float(w['score']))]
        conf = sum(scores)/len(scores) if scores else None
        actual_tokens = [str(w.get('word','')).strip() for w in chosen]
        actual_text = ' '.join(actual_tokens)
        status = 'PASS' if ratio >= 0.985 else 'REVIEW_TEXT_VARIATION'
        if conf is not None and conf < 0.45: status = 'REVIEW_LOW_START_CONFIDENCE'
        notes = f"Sequential normalized token alignment; similarity={ratio:.3f}; matched_words={len(chosen)}"
        if conf is None: notes += '; word confidence unavailable from aligner'
        matched.append({
            'mapping': row, 'voice_start': start_time, 'voice_end': end_time,
            'text': actual_text, 'first': actual_tokens[0] if actual_tokens else '',
            'last': actual_tokens[-1] if actual_tokens else '', 'confidence': conf,
            'status': status, 'notes': notes,
        })
        cursor = max(start_i + 1, end_i)
    # Timeline marker zero is intentional for the opening image. Other markers use detected speech starts.
    marker_times = [0.0] + [x['voice_start'] for x in matched[1:]]
    for i in range(1, len(marker_times)):
        if marker_times[i] <= marker_times[i-1]:
            raise ValueError(f"Detected marker timestamps are not strictly increasing at Image_{i+1:03d}; review alignment rather than inventing times.")
    if marker_times[-1] >= audio_duration:
        raise ValueError('The last matched image starts at or after the end of the audio.')
    result: list[dict[str,str]] = []
    company = str(mapping[0].get('Company',''))
    for i, item in enumerate(matched):
        row = item['mapping']; marker = marker_times[i]
        hold_end = marker_times[i+1] if i+1 < len(marker_times) else audio_duration
        if hold_end <= marker: raise ValueError(f'Non-positive image hold at Image_{i+1:03d}.')
        est_start = parse_estimate(row.get('Start_Estimate'))
        est_end = parse_estimate(row.get('End_Estimate'))
        conf = item['confidence']
        result.append({
            'Marker_Index': str(i+1), 'Marker_Name': f"Marker_{i+1:03d}",
            'Company': str(row.get('Company') or company), 'Image_No': f"{int(row['Image_No']):03d}",
            'Image_File': str(row.get('Image_File') or ''),
            'Marker_Time_Seconds': fmt_seconds(marker), 'Marker_Elapsed_HHMMSS_mmm': fmt_elapsed(marker),
            'Voiceover_Start_Seconds': fmt_seconds(item['voice_start']), 'Voiceover_End_Seconds': fmt_seconds(item['voice_end']),
            'Image_Hold_End_Seconds': fmt_seconds(hold_end), 'Image_Hold_Duration_Seconds': fmt_seconds(hold_end-marker),
            'Expected_Voiceover_Span': str(row.get('Exact_Voiceover_Span') or ''),
            'Detected_ASR_Text': item['text'], 'First_ASR_Word': item['first'], 'Last_ASR_Word': item['last'],
            'Average_ASR_Confidence': fmt_seconds(conf),
            'Original_Estimated_Start_Seconds': fmt_seconds(est_start), 'Original_Estimated_End_Seconds': fmt_seconds(est_end),
            'Speech_Start_Drift_vs_Estimate_Seconds': fmt_seconds(item['voice_start']-est_start if est_start is not None else None),
            'Alignment_Status': item['status'], 'Alignment_Notes': item['notes'],
        })
    return result

def write_master_csv(rows: list[dict[str,str]], output_path: str | Path) -> Path:
    p = Path(output_path).expanduser().resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation is deliberate: a generated Final Master must never
    # replace a user's existing CSV, even when a caller bypasses the UI.
    handle = p.open('x', encoding='utf-8-sig', newline='')
    try:
        with handle as f:
            writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS, extrasaction='ignore')
            writer.writeheader(); writer.writerows(rows)
            f.flush()
    except Exception:
        p.unlink(missing_ok=True)
        raise
    return p
