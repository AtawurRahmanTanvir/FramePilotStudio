# FramePilot Motion Producer Pro v2.0

An independent production Skill and project handoff system for generating FramePilot-compatible Remotion source packages.

## Responsibility boundary

- **FramePilot Word Timing:** script/audio alignment, five-column CSV and QA sidecar.
- **Claude Skill:** source audit, editorial structure, asset mapping, scene plans, Remotion source, static validation and project ZIP.
- **FramePilot Studio:** security-gated import and final local MP4 render through the single `RENDER VIDEO` action.
- **User/team:** approved creative brief, assets, source/factual authority and final human review.

Claude must not render MP4/GIF/still previews, run Remotion render commands, create SRT/VTT, or ask the user to run PowerShell/CMD. The final video render is a FramePilot-only operation.

## Quick start

1. Extract this package.
2. Upload and enable `Claude_Skill_Upload.zip` using the custom Skills interface, or install the `claude-skill/framepilot-motion-producer/` directory in Claude Code.
3. Add `claude-project/PROJECT_INSTRUCTIONS.md` to the persistent Claude Project Instructions once.
4. For each video upload the approved script, matching voiceover, canonical FramePilot CSV, optional QA JSON, all required assets and the production brief.
5. Invoke `/framepilot-motion-producer` and request one complete import-ready project ZIP.
6. Import that project ZIP into FramePilot Studio and click `RENDER VIDEO`.

## Canonical CSV

`Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms`

The Motion CSV is separate from Filmora's 21-column Final Master CSV. No SRT/VTT substitution is allowed.

## Validation commands

```bash
python tools/validate_word_timing.py path/to/word_timing.csv --json-output timing-report.json
python tools/csv_to_frame_timing.py path/to/word_timing.csv --fps 30 --output word_timing.frames.json
python tools/validate_project_zip.py path/to/project.zip --json-output project-report.json
python -m unittest discover -s tests -v
```

These tools perform static validation only. They do not execute imported source, prove Windows isolation, render media, or certify visual quality.

## Package contents

See `metadata/FILE_INDEX.json` for the complete inventory and `metadata/SHA256SUMS.txt` for hashes.
