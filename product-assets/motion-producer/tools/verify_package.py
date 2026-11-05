#!/usr/bin/env python3
"""Run package-level structural checks; does not execute project code."""
from __future__ import annotations
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README_BN.md",
    "project-instructions/PROJECT_INSTRUCTIONS.md",
    "project-instructions/PER_VIDEO_INTAKE.md",
    "claude-skill/framepilot-motion-producer/SKILL.md",
    "claude-skill/framepilot-motion-producer/references/WORD_TIMING_CSV_CONTRACT.md",
    "claude-skill/framepilot-motion-producer/references/FRAMEPILOT_PROJECT_CONTRACT.md",
    "examples/sample-remotion-project/motion-project.json",
    "tools/validate_word_timing.py",
    "tools/csv_to_frame_timing.py",
    "tools/validate_project_zip.py",
    "tests/test_producer_tools.py",
    "skill-package/Claude_Skill_Upload.zip",
]
missing = [relative for relative in REQUIRED if not (ROOT / relative).is_file()]
if missing:
    raise SystemExit("Missing required files: " + ", ".join(missing))
skill_zip = ROOT / "skill-package" / "Claude_Skill_Upload.zip"
with zipfile.ZipFile(skill_zip) as archive:
    names = archive.namelist()
    if "framepilot-motion-producer/SKILL.md" not in names:
        raise SystemExit("Claude Skill ZIP does not contain the expected root Skill folder")
    if any(name.startswith("framepilot-motion-producer/README") for name in names):
        raise SystemExit("Unexpected README inside Skill directory")
manifest = json.loads((ROOT / "examples/sample-remotion-project/motion-project.json").read_text(encoding="utf-8"))
if manifest["compositionId"] != "Main" or manifest["remotionVersion"] != "4.0.540":
    raise SystemExit("Sample project manifest contract mismatch")
print(f"PASS: {len(REQUIRED)} required files present")
print(f"PASS: Skill archive structure ({len(names)} files)")
print("PASS: sample project manifest")
print("NOTE: no project source was executed; Windows sandbox and real render remain outside this check")
