#!/usr/bin/env python3
"""Create a clean FramePilot project ZIP with motion-project.json at its root.

This script packages files only. It does not execute imported project code,
install dependencies, render previews, or render final media.
"""
from __future__ import annotations

import argparse
import os
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

EXCLUDED_DIRS = {"node_modules", ".git", "__pycache__", ".cache", "dist", "build", "coverage", ".venv"}
EXCLUDED_FILES = {".env", ".env.local", ".npmrc", "Thumbs.db", ".DS_Store"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("output_zip", type=Path)
    args = parser.parse_args()
    root = args.project_dir.resolve()
    if not root.is_dir():
        parser.error("project_dir must be an existing directory")
    manifest = root / "motion-project.json"
    if not manifest.is_file():
        parser.error("motion-project.json must be at the project root")
    output = args.output_zip.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for current, dirs, files in os.walk(root, followlinks=False):
            current_path = Path(current)
            dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIRS and not (current_path / d).is_symlink())
            for filename in sorted(files):
                source = current_path / filename
                if filename in EXCLUDED_FILES or source.is_symlink() or not source.is_file():
                    continue
                relative = source.relative_to(root).as_posix()
                posix = PurePosixPath(relative)
                if posix.is_absolute() or ".." in posix.parts:
                    raise SystemExit(f"Unsafe path refused: {relative}")
                if source.resolve() == output:
                    continue
                archive.write(source, relative)
                count += 1
    print(f"Created {output} with {count} files")
    print("No project code was executed. Run validate_project_zip.py before importing into FramePilot.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
