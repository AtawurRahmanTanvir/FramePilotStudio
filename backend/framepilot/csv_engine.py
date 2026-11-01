from __future__ import annotations
import csv, math
from pathlib import Path
from typing import Any

REQUIRED = {"Marker_Index", "Marker_Name", "Company", "Image_No", "Image_File", "Marker_Time_Seconds", "Image_Hold_End_Seconds", "Image_Hold_Duration_Seconds", "Alignment_Status"}
FULL_MASTER = [
    "Marker_Index", "Marker_Name", "Company", "Image_No", "Image_File",
    "Marker_Time_Seconds", "Marker_Elapsed_HHMMSS_mmm", "Voiceover_Start_Seconds",
    "Voiceover_End_Seconds", "Image_Hold_End_Seconds", "Image_Hold_Duration_Seconds",
    "Expected_Voiceover_Span", "Detected_ASR_Text", "First_ASR_Word", "Last_ASR_Word",
    "Average_ASR_Confidence", "Original_Estimated_Start_Seconds", "Original_Estimated_End_Seconds",
    "Speech_Start_Drift_vs_Estimate_Seconds", "Alignment_Status", "Alignment_Notes"
]

def validate_master_csv(path: str | Path) -> dict[str, Any]:
    p = Path(path).expanduser().resolve()
    if not p.is_file(): raise FileNotFoundError(f"CSV not found: {p}")
    with p.open('r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        missing = sorted(set(FULL_MASTER) - set(headers))
        if missing: raise ValueError("Final Master CSV missing columns: " + ", ".join(missing))
        extras = [h for h in headers if h not in FULL_MASTER]
        if extras: raise ValueError("Final Master CSV contains unexpected columns: " + ", ".join(extras))
        rows = list(reader)
    if not rows: raise ValueError("CSV has no marker rows")
    if headers != FULL_MASTER:
        raise ValueError('Final Master CSV columns are not in the required 21-column order.')
    issues: list[str] = []
    prev_time = -math.inf
    images: list[int] = []
    statuses: dict[str, int] = {}
    collision_frames: list[int] = []
    seen_frames: set[int] = set()
    for line, row in enumerate(rows, start=2):
        try:
            idx = int(row['Marker_Index']); image = int(row['Image_No']); t = float(row['Marker_Time_Seconds'])
        except (TypeError, ValueError) as e: raise ValueError(f"Invalid index/image/time at CSV line {line}: {e}")
        if idx != line - 1: issues.append(f"Line {line}: Marker_Index {idx}, expected {line-1}")
        if image <= 0: issues.append(f"Line {line}: invalid Image_No {image}")
        if not math.isfinite(t) or t < 0: issues.append(f"Line {line}: invalid marker time")
        if t <= prev_time: issues.append(f"Line {line}: marker time not strictly increasing")
        prev_time = t; images.append(image)
        frame = round(t * 25)
        if frame in seen_frames: collision_frames.append(frame)
        seen_frames.add(frame)
        try:
            voice_start = float(row['Voiceover_Start_Seconds'])
            voice_end = float(row['Voiceover_End_Seconds'])
            if not (math.isfinite(voice_start) and math.isfinite(voice_end)) or voice_start < 0 or voice_end <= voice_start:
                issues.append(f"Line {line}: invalid or non-positive aligned voiceover interval")
        except (TypeError, ValueError):
            issues.append(f"Line {line}: aligned voiceover start/end must be numeric")
        hold_end_raw = row.get('Image_Hold_End_Seconds', '')
        hold_duration_raw = row.get('Image_Hold_Duration_Seconds', '')
        if hold_end_raw and hold_duration_raw:
            try:
                hold_end = float(hold_end_raw)
                hold_duration = float(hold_duration_raw)
                if not (math.isfinite(hold_end) and math.isfinite(hold_duration)) or hold_end <= t or hold_duration <= 0:
                    issues.append(f"Line {line}: image hold end/duration is invalid")
                elif abs((hold_end - t) - hold_duration) > 0.002:
                    issues.append(f"Line {line}: image hold duration does not equal hold end minus marker time")
                if line == len(rows) + 1 and hold_end + 0.002 < voice_end:
                    issues.append('Final image hold ends before the final aligned voiceover ends.')
            except (TypeError, ValueError):
                issues.append(f"Line {line}: image hold end/duration must be numeric")
        elif bool(hold_end_raw) != bool(hold_duration_raw):
            issues.append(f"Line {line}: image hold end and duration must both be present or both be blank")
        status = row.get('Alignment_Status','') or 'UNSPECIFIED'
        statuses[status] = statuses.get(status,0)+1
        # Incomplete final hold is a review item, not automatically a fatal error.
        if line == len(rows)+1 and (not row.get('Image_Hold_End_Seconds') or not row.get('Image_Hold_Duration_Seconds')):
            issues.append('Final image hold end/duration is blank; derive it from the verified audio/project end before export.')
    if images != list(range(1, len(images)+1)):
        issues.append('Image_No values are not a continuous 1..N sequence.')
    if collision_frames:
        issues.append(f'25 FPS frame collision(s) detected at frame(s): {collision_frames[:20]}')
    if abs(float(rows[0]['Marker_Time_Seconds'])) > 1e-9:
        issues.append('The first marker must start at 0.000 seconds for this workflow.')
    fatal = any(
        ('not strictly increasing' in x) or ('Invalid' in x) or ('invalid ' in x.lower())
        or ('must be numeric' in x) or ('must equal' in x) or ('before the final aligned' in x)
        or ('Image_No values are not a continuous' in x) or ('25 FPS frame collision' in x)
        or ('first marker must start' in x)
        for x in issues
    )
    return {
        'file': str(p), 'rows': len(rows), 'columns': len(headers),
        'schema_ok': all(c in headers for c in FULL_MASTER),
        'first_marker': float(rows[0]['Marker_Time_Seconds']),
        'last_marker': float(rows[-1]['Marker_Time_Seconds']),
        'image_sequence_ok': images == list(range(1,len(images)+1)),
        'frame_rate_assumption': 25, 'frame_collisions': collision_frames,
        'statuses': statuses, 'issues': issues, 'can_continue': not fatal
    }


def write_qa_report(csv_path: str | Path, report: dict[str, Any]) -> Path:
    p = Path(csv_path).expanduser().resolve().with_suffix('.QA.txt')
    lines = [
        'FramePilot Studio — Final Master CSV QA',
        '=' * 54,
        f"CSV: {report.get('file','')}",
        f"Rows: {report.get('rows',0)}",
        f"Columns: {report.get('columns',0)}",
        f"Schema: {'PASS' if report.get('schema_ok') else 'FAIL'}",
        f"Image sequence: {'PASS' if report.get('image_sequence_ok') else 'FAIL'}",
        f"Assumed project frame rate: {report.get('frame_rate_assumption',25)} FPS",
        f"Frame collisions: {report.get('frame_collisions',[])}",
        f"Alignment statuses: {report.get('statuses',{})}",
        'Timestamps invented/estimated: NO',
        '', 'Review notes:'
    ]
    lines.extend(f'- {issue}' for issue in report.get('issues',[]) or ['None'])
    handle = p.open('x', encoding='utf-8', newline='')
    try:
        with handle:
            handle.write('\n'.join(lines))
            handle.flush()
    except Exception:
        p.unlink(missing_ok=True)
        raise
    return p
