#!/usr/bin/env python3
"""Build the Claude custom Skill ZIP from this package's source folder."""
from __future__ import annotations
import argparse
import zipfile
from pathlib import Path


def main() -> int:
    base = Path(__file__).resolve().parents[1]
    skill = base / "claude-skill" / "framepilot-motion-producer"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=base / "skill-package" / "Claude_Skill_Upload.zip")
    args = parser.parse_args()
    if not (skill / "SKILL.md").is_file():
        raise SystemExit(f"Missing SKILL.md: {skill}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
        for file in sorted(skill.rglob("*")):
            if file.is_file():
                archive.write(file, (Path("framepilot-motion-producer") / file.relative_to(skill)).as_posix())
    print(f"Created {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
