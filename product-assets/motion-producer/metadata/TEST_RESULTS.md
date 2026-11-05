# Package Validation Results — v2.0.0

Executed in the package build environment on 2026-11-05.

## Unit tests

Command:

```bash
python -m unittest discover -s tests -v
```

Result: **9 tests passed**.

- Valid word timing CSV — PASS.
- Script/recognized mismatch and untimed row are warnings — PASS.
- Duplicate index and partial time range fail — PASS.
- UTF-8 BOM and Bengali text CSV — PASS.
- Sample project ZIP static validation — PASS.
- ZIP path traversal rejected — PASS.
- Wrapper-folder manifest rejected — PASS.
- Millisecond-to-frame conversion — PASS.
- Project packager keeps manifest at ZIP root — PASS.

## User-supplied sample CSV

File: `examples/csv-fixtures/framepilot_sample.csv`

- Total rows: 4.
- Valid timed recognized-word rows: 3.
- Untimed rows: 1.
- Script/recognized mismatches: 1 (`friend` vs `frend`).
- Overlaps: 0.
- Warnings: 3.
- Errors: 0.
- Status: `PASS_WITH_WARNINGS`.

The derived frame-timing JSON contains 3 timed words and 1 skipped row. The original CSV remains unchanged.

## Additional package contents

- Claude upload ZIP: **47 entries**, with `framepilot-motion-producer/SKILL.md` at the required skill-folder root.
- Reusable motion component templates: **12** original TSX source modules.
- JSON schemas: **4** (project manifest, asset manifest, scene plan, timing review).

## Static package checks

The sample Remotion project ZIP passed the package validator: 15 files, 12,230 uncompressed bytes, no warnings or errors. The validator did not execute source code and explicitly reports that it is not a Windows security sandbox.

## Not run / not certified

- Claude upload and skill invocation in a live account.
- Real user Remotion project imported into FramePilot.
- Remotion bundle/build or MP4 render.
- Final visual/audio QA.
- Windows AppContainer/restricted-token/network/filesystem isolation and adversarial tests.
- 10–30 minute render performance or cancellation under a real project.
- Bengali font shaping or Bengali voice-alignment certification.
- The supplied YouTube reference video; it was inaccessible in this build environment.

These items are intentionally not marked PASS.
