# Team Workflow, Naming and Version Control

## Naming rules

- Project: `FramePilot_Motion_Project_<slug>_v001.zip`
- Main script copy: retain supplied filename; add `_source` only to a working copy.
- Word timing: `word_timing.csv` (do not rename source columns).
- Optional QA sidecar: `word_timing.QA.json`.
- Project metadata: `project-data/`.
- Scene IDs: `scene-001`, `scene-002`, etc. Stable across revisions when the narrative beat remains the same.
- Asset IDs: `IMG_0001`, `VID_0001`, `AUD_0001`, `FONT_0001`, `DOC_0001`.

## Revision rules

- Never overwrite the only copy of a prior delivered ZIP.
- Keep a decision log and version number.
- Do not renumber unchanged assets during revision.
- Add a new asset ID only for a new source file.
- Keep previous project ZIPs until the user confirms replacement.
- If a scene is materially rewritten, preserve the old scene ID in change notes and use a new ID only when it is a genuinely new beat.

## Team handoff responsibilities

- Producer: uploads approved source and defines constraints.
- Script editor: verifies narrative and factual wording.
- Motion designer / Claude Skill: creates scene plan and visual grammar.
- Remotion engineer / Claude Skill: implements modular source.
- FramePilot: validates import/security and renders locally.
- Reviewer: checks actual MP4 and returns precise notes.

## Change request format

A useful note identifies:

- Output filename and timecode.
- What is wrong.
- What should happen instead.
- Whether the issue is timing, visual, factual, continuity, typography, audio or export.
- Whether the supplied source is authoritative.

Do not request vague revisions such as “make it more cinematic” without a concrete goal. Translate broad taste feedback into a defined visual change and document the assumption.
