#!/usr/bin/env python3
"""Validate the canonical FramePilot five-column word-timing CSV.

Standard-library only. This program is read-only and never rewrites the input.
Exit codes: 0 = PASS/PASS_WITH_WARNINGS, 2 = FAIL, 3 = input/read error.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

EXPECTED = ["Word_Index", "Script_Word", "Recognized_Word", "Start_ms", "End_ms"]
PUNCTUATION = ".,!?;:，。！？；：、…—–-\"'“”‘’()[]{}"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_token(value: str) -> str:
    return value.casefold().strip().strip(PUNCTUATION).strip()


def finite_number(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("timestamp must be finite")
    return number


def validate(path: Path) -> dict[str, Any]:
    report: dict[str, Any] = {
        "schemaVersion": "1.0",
        "sourceCsv": path.name,
        "status": "PASS",
        "totalRows": 0,
        "validTimedRows": 0,
        "untimedRows": 0,
        "mismatchRows": 0,
        "overlapRows": 0,
        "sha256": None,
        "warnings": [],
        "errors": [],
    }
    if not path.is_file():
        report["status"] = "FAIL"
        report["errors"].append({"type": "file_not_found", "message": str(path)})
        return report

    report["sha256"] = sha256_file(path)
    seen_indices: set[int] = set()
    previous_index: int | None = None
    previous_start: float | None = None
    previous_end: float | None = None

    try:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if reader.fieldnames != EXPECTED:
                report["errors"].append({
                    "type": "header_mismatch",
                    "expected": EXPECTED,
                    "actual": reader.fieldnames,
                })
                report["status"] = "FAIL"
                return report

            for line_no, row in enumerate(reader, start=2):
                report["totalRows"] += 1
                if None in row:
                    report["errors"].append({"line": line_no, "type": "extra_csv_fields"})
                    continue

                raw_index = (row.get("Word_Index") or "").strip()
                script_word = (row.get("Script_Word") or "").strip()
                recognized_word = (row.get("Recognized_Word") or "").strip()
                start_raw = (row.get("Start_ms") or "").strip()
                end_raw = (row.get("End_ms") or "").strip()

                try:
                    index = int(raw_index)
                    if index < 1:
                        raise ValueError("must be >= 1")
                except ValueError:
                    report["errors"].append({
                        "line": line_no, "type": "invalid_word_index", "value": raw_index,
                    })
                    continue

                if index in seen_indices:
                    report["errors"].append({
                        "line": line_no, "type": "duplicate_word_index", "value": index,
                    })
                if previous_index is not None and index <= previous_index:
                    report["warnings"].append({
                        "line": line_no, "type": "word_index_not_increasing",
                        "previous": previous_index, "current": index,
                    })
                if previous_index is not None and index > previous_index + 1:
                    report["warnings"].append({
                        "line": line_no, "type": "word_index_gap",
                        "from": previous_index, "to": index,
                    })
                seen_indices.add(index)
                previous_index = index

                if script_word and recognized_word:
                    if normalize_token(script_word) != normalize_token(recognized_word):
                        report["mismatchRows"] += 1
                        report["warnings"].append({
                            "line": line_no,
                            "type": "script_recognition_mismatch",
                            "word_index": index,
                            "script_word": script_word,
                            "recognized_word": recognized_word,
                        })

                if not recognized_word:
                    report["warnings"].append({
                        "line": line_no, "type": "empty_recognized_word", "word_index": index,
                    })

                if not start_raw and not end_raw:
                    report["untimedRows"] += 1
                    report["warnings"].append({
                        "line": line_no, "type": "missing_time_range", "word_index": index,
                    })
                    continue
                if not start_raw or not end_raw:
                    report["errors"].append({
                        "line": line_no, "type": "partial_time_range",
                        "start_ms": start_raw, "end_ms": end_raw,
                    })
                    continue

                try:
                    start_ms = finite_number(start_raw)
                    end_ms = finite_number(end_raw)
                    if start_ms < 0:
                        raise ValueError("Start_ms must be >= 0")
                    if end_ms <= start_ms:
                        raise ValueError("End_ms must be greater than Start_ms")
                except ValueError as exc:
                    report["errors"].append({
                        "line": line_no, "type": "invalid_time_range", "message": str(exc),
                        "start_ms": start_raw, "end_ms": end_raw,
                    })
                    continue

                if not recognized_word:
                    report["warnings"].append({
                        "line": line_no, "type": "timed_row_without_recognized_word",
                        "word_index": index,
                    })
                    continue

                if previous_start is not None and start_ms < previous_start:
                    report["warnings"].append({
                        "line": line_no, "type": "non_monotonic_start",
                        "previous_start_ms": previous_start, "start_ms": start_ms,
                    })
                if previous_end is not None and start_ms < previous_end:
                    report["overlapRows"] += 1
                    report["warnings"].append({
                        "line": line_no, "type": "overlapping_interval",
                        "previous_end_ms": previous_end, "start_ms": start_ms,
                    })
                previous_start = start_ms
                previous_end = max(previous_end or 0.0, end_ms)
                report["validTimedRows"] += 1

    except (OSError, UnicodeError, csv.Error) as exc:
        report["status"] = "FAIL"
        report["errors"].append({"type": "read_error", "message": str(exc)})
        return report

    if report["errors"]:
        report["status"] = "FAIL"
    elif report["warnings"]:
        report["status"] = "PASS_WITH_WARNINGS"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    parser.add_argument("--json-output", type=Path, help="Also save report as JSON")
    args = parser.parse_args()
    report = validate(args.csv_path)

    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"Status: {report['status']}")
        print(f"Rows: {report['totalRows']} | Valid timed: {report['validTimedRows']} | Untimed: {report['untimedRows']}")
        print(f"Mismatches: {report['mismatchRows']} | Overlaps: {report['overlapRows']}")
        print(f"Warnings: {len(report['warnings'])} | Errors: {len(report['errors'])}")
        for item in report["errors"][:15]:
            print("ERROR:", json.dumps(item, ensure_ascii=False))
        for item in report["warnings"][:15]:
            print("WARNING:", json.dumps(item, ensure_ascii=False))
        if len(report["warnings"]) > 15:
            print(f"... {len(report['warnings']) - 15} additional warnings in JSON report")

    return 2 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
