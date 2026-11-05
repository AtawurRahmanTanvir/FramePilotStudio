# FramePilot Motion Producer Pro — Production System Overview

## System goal

Create a repeatable, high-quality pipeline that converts one approved documentary/explainer brief into one editable Remotion project ZIP without making Claude responsible for video rendering.

## Four production phases

### A. Source truth

- Script defines intended narrative/facts.
- Voiceover defines actual performance and audio duration.
- FramePilot CSV defines word timing and actual recognized words.
- Assets define available visual evidence and continuity constraints.
- Project brief defines output format, visual direction, image-count policy and sound policy.

### B. Editorial engineering

- Story arc and chapter map.
- Claim/evidence ledger.
- Scene/beat graph.
- Asset-to-scene allocation.
- Word and scene timing map.
- Visual grammar and continuity rules.

### C. Remotion engineering

- Root manifest and pinned dependency contract.
- Modular scene components.
- Data-driven word/scene timing.
- Local media, theme tokens and deterministic animation.
- Static source and ZIP validation.

### D. Local render handoff

- One FramePilot project ZIP.
- Import validation and Windows sandbox gate run by FramePilot.
- One `RENDER VIDEO` action.
- Local MP4 output and trusted FFprobe verification.
- Human review and targeted revision.

## Project state model

`SOURCE_RECEIVED → SOURCE_AUDITED → TIMING_VALIDATED → STORY_MAPPED → ASSETS_MAPPED → SOURCE_BUILT → STATIC_QA → ZIP_PACKAGED → IMPORTED_BY_FRAMEPILOT → SECURITY_APPROVED → LOCALLY_RENDERED → HUMAN_REVIEWED`

Claude may report only up to `ZIP_PACKAGED`. `IMPORTED_BY_FRAMEPILOT` and later statuses require evidence from FramePilot or the user.

## Quality gates

| Gate | Must be true before advancing |
|---|---|
| Source gate | Script, audio and supplied assets inventoried |
| Timing gate | CSV header/schema checked; problems preserved and reported |
| Editorial gate | All major script sections mapped to visual functions |
| Asset gate | Every required asset accounted for with preserved filename |
| Engineering gate | Manifest, entry, Composition and pinned versions agree |
| Static QA gate | Archive and project references pass deterministic checks |
| Import gate | FramePilot importer accepts the package |
| Security gate | Windows-enforced isolation tests pass |
| Render gate | FramePilot worker completes and FFprobe verifies output |
| Human gate | User reviews and approves the actual output |

The Skill cannot self-approve the import, security, render or human-review gates.
