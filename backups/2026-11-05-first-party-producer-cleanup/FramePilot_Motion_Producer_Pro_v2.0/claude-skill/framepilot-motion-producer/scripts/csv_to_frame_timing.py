#!/usr/bin/env python3
"""Convert FramePilot word CSV milliseconds to absolute Remotion frame intervals.

The original CSV is never edited. Uses floor(start) and ceil(end), with an
exclusive end frame, so repeated per-word rounding does not accumulate drift.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any

EXPECTED = ["Word_Index", "Script_Word", "Recognized_Word", "Start_ms", "End_ms"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--fps", type=float, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not math.isfinite(args.fps) or args.fps <= 0 or args.fps > 240:
        parser.error("--fps must be > 0 and <= 240")

    timed: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    with args.csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != EXPECTED:
            raise SystemExit(f"Header mismatch. Expected exact columns: {EXPECTED}")
        for line_no, row in enumerate(reader, start=2):
            recognized = (row.get("Recognized_Word") or "").strip()
            start_raw = (row.get("Start_ms") or "").strip()
            end_raw = (row.get("End_ms") or "").strip()
            if not recognized:
                skipped.append({"line": line_no, "wordIndex": row.get("Word_Index"), "reason": "empty_recognized_word"})
                continue
            if not start_raw or not end_raw:
                skipped.append({"line": line_no, "wordIndex": row.get("Word_Index"), "reason": "missing_time_range"})
                continue
            try:
                index = int(row["Word_Index"])
                start_ms = float(start_raw)
                end_ms = float(end_raw)
                if index < 1 or not math.isfinite(start_ms) or not math.isfinite(end_ms):
                    raise ValueError("non-finite time or invalid index")
                if start_ms < 0 or end_ms <= start_ms:
                    raise ValueError("invalid interval")
            except (ValueError, TypeError) as exc:
                skipped.append({"line": line_no, "wordIndex": row.get("Word_Index"), "reason": str(exc)})
                continue

            start_frame = math.floor(start_ms * args.fps / 1000.0)
            end_frame_exclusive = max(start_frame + 1, math.ceil(end_ms * args.fps / 1000.0))
            timed.append({
                "wordIndex": index,
                "scriptWord": row.get("Script_Word", ""),
                "recognizedWord": recognized,
                "startMs": start_ms,
                "endMs": end_ms,
                "startFrame": start_frame,
                "endFrameExclusive": end_frame_exclusive,
                "durationInFrames": end_frame_exclusive - start_frame,
            })

    output = {
        "schemaVersion": "1.0",
        "sourceCsv": args.csv_path.name,
        "fps": args.fps,
        "timeUnit": "milliseconds",
        "frameInterval": "start-inclusive/end-exclusive",
        "rounding": {"start": "floor", "end": "ceil"},
        "timedWordCount": len(timed),
        "skippedRowCount": len(skipped),
        "timedWords": timed,
        "skippedRows": skipped,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(timed)} timed words; skipped {len(skipped)} rows -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
