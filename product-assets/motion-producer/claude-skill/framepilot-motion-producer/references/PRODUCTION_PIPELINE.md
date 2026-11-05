# PRODUCTION_PIPELINE.md
# FramePilot Motion Producer — Complete Production Pipeline

## Overview

This document defines the **canonical one-pass execution pipeline** Claude follows for every motion project request. Deviating from this order causes asset conflicts, timing errors, and delivery failures.

---

## Pipeline Phases (In Order)

```
SCRIPT + CSV + ASSETS
        ↓
  [Phase 0] Pre-flight & Source Inventory
        ↓
  [Phase 1] Timing Audit
        ↓
  [Phase 2] Script Analysis & Editorial Plan
        ↓
  [Phase 3] Scene Map & Coverage Validation
        ↓
  [Phase 4] Visual Direction & Asset Matching
        ↓
  [Phase 5] Code Generation
        ↓
  [Phase 6] Static QA
        ↓
  [Phase 7] ZIP Packaging & Delivery
```

---

## Phase 0 — Pre-flight & Source Inventory

**Gate: Can proceed only if CSV is parseable and SCRIPT text is non-empty.**

### Actions
1. Parse and validate the Word Timing CSV (see `WORD_TIMING_CSV_CONTRACT.md`).
2. Enumerate all supplied assets (images, fonts, additional audio).
3. Confirm narration binding from `motion-project.json` or session context (see `NARRATION_ASSET_BINDING.md`).
4. Write `project-data/source-inventory.json`.

### Source Inventory Schema

```json
{
  "inventoryTimestamp": "2024-01-15T09:30:00Z",
  "script": {
    "charCount": 2847,
    "wordCount": 412,
    "languageDetected": "en",
    "secondaryLanguages": ["bn"]
  },
  "csv": {
    "totalRows": 408,
    "firstWordMs": 320,
    "lastWordEndMs": 187400,
    "durationMs": 187900,
    "malformedRows": 0
  },
  "narration": {
    "bound": true,
    "sessionId": "sess-abc123",
    "originalFilename": "voiceover_final.wav",
    "durationMs": 187400
  },
  "suppliedAssets": [
    { "filename": "protest-march-1971.jpg", "type": "image", "sizeBytes": 1842944 },
    { "filename": "document-scan.png",      "type": "image", "sizeBytes": 921600 }
  ],
  "missingAssets": []
}
```

### Ask vs. Use Defaults

| Situation | Action |
|-----------|--------|
| CSV missing but script present | ABORT — blocking error |
| Narration session ID missing | Use documented fallback (see `NARRATION_ASSET_BINDING.md`) |
| Image referenced in script not supplied | Log to decision log, generate placeholder |
| Font requested not available | Fall back to system font, log decision |
| Duration ambiguous | Use `max(End_ms) + 500ms` from CSV |

> ⛔ Anti-pattern: Asking the user "Can you upload the voiceover again?" — The narration binding resolves it. Never ask.

---

## Phase 1 — Timing Audit

**Gate: Source inventory complete, narration duration confirmed.**

### Actions
1. Cross-check CSV `durationMs` against narration `durationMs`. Tolerance: ±2000ms.
2. Identify long silence gaps (>3s between words) — these become candidate scene boundaries.
3. Flag any words with `Start_ms > End_ms` as malformed rows.
4. Compute `totalFrames = ceil(durationMs / 1000 * fps)` where `fps = 30`.
5. Write timing audit summary to decision log.

### Timing Audit Decision Log Entry

```json
{
  "phase": "timing-audit",
  "timestamp": "2024-01-15T09:31:00Z",
  "csvDurationMs": 187400,
  "narrationDurationMs": 187000,
  "driftMs": 400,
  "driftAcceptable": true,
  "silenceGaps": [
    { "afterWordIndex": 42, "gapMs": 3800 },
    { "afterWordIndex": 118, "gapMs": 5200 }
  ],
  "malformedRows": 0,
  "totalFrames": 5622
}
```

---

## Phase 2 — Script Analysis & Editorial Plan

**Gate: Timing audit passed. At least 1 valid CSV row.**

### Actions
1. Run full script analysis (see `SCRIPT_ANALYSIS.md`).
2. Extract named entities, sentiment arc, speakers, key phrases.
3. Identify story beats and act structure (see `STORY_ARCHITECTURE.md`).
4. Produce editorial plan: narrative intent per scene type.
5. Determine total scene count using formula from `STORY_ARCHITECTURE.md`.

### Editorial Plan Schema (in-memory, fed into Phase 3)

```json
{
  "totalDurationMs": 187900,
  "storyBeats": ["opening", "context", "conflict", "evidence", "revelation", "resolution"],
  "toneArc": ["solemn", "building", "intense", "resolving"],
  "estimatedSceneCount": 14,
  "keyPhrases": ["liberation war", "1971", "nine months"],
  "namedEntities": {
    "people": ["Sheikh Mujibur Rahman"],
    "places": ["Dhaka", "Bangladesh"],
    "dates": ["March 25, 1971", "December 16, 1971"],
    "organizations": ["Mukti Bahini"]
  }
}
```

---

## Phase 3 — Scene Map & Coverage Validation

**Gate: Editorial plan complete.**

### Actions
1. Apply scene boundary detection algorithm (see `SCENE_PLANNING.md`).
2. Assign scene types, timing windows, visual objectives.
3. Validate: every CSV word belongs to exactly one scene.
4. Write `project-data/scene-plan.json`.
5. Write `project-data/scene-coverage.csv` mapping `wordIndex → sceneId`.

### Coverage Validation Checklist
- [ ] No word index appears in two scenes
- [ ] No word index is unassigned
- [ ] Every scene has `startMs < endMs`
- [ ] No scene shorter than 2000ms
- [ ] No scene longer than 30000ms without internal beat
- [ ] Scene sequence is contiguous (scene N endMs = scene N+1 startMs, ±16ms tolerance)

---

## Phase 4 — Visual Direction & Asset Matching

**Gate: Scene plan validated.**

### Actions
1. Apply visual direction system (see `VISUAL_DIRECTION_SYSTEM.md`).
2. For each scene, select or assign assets from the inventory.
3. Generate SFX event list for `sfxEvents` in each scene (see `SOUND_DESIGN_AND_SFX_GENERATION.md`).
4. Record unresolved asset slots in decision log.
5. Write `project-data/asset-manifest.json`.

---

## Phase 5 — Code Generation

**Gate: Asset manifest complete, scene plan locked.**

### Actions
1. Scaffold project directory structure.
2. Write `src/Root.tsx` with composition definitions.
3. Write one `.tsx` component per scene in `src/scenes/`.
4. Write shared components to `src/components/`.
5. Write `public/` asset references (paths only — narration resolved at import).
6. Write `motion-project.json` with narration binding.
7. Write `package.json` with exact dependency versions.
8. Run `generate_sfx.py` for each required SFX family.

> Code generation is **not** iterative. Plan before coding. All scene components must be written from the locked scene plan, not revised mid-generation.

---

## Phase 6 — Static QA

**Gate: All source files written.**

### Actions
1. Run all checks from `STATIC_QA_AND_DELIVERY.md`.
2. Verify all `staticFile()` paths resolve to files in `public/`.
3. Confirm frame math: `endFrame - startFrame` matches `(endMs - startMs) / 1000 * 30` for each scene.
4. Count total Remotion `<Composition>` entries — must be ≥ 1.
5. Write `STATIC_QA_REPORT.md`.

---

## Phase 7 — ZIP Packaging & Delivery

**Gate: Static QA passed (or non-blocking errors documented).**

### Actions
1. Assemble all files per the ZIP contract (see `PROJECT_PACKAGING_CONTRACT.md`).
2. Exclude blocked file types.
3. Write `PROJECT_README.md`.
4. Package ZIP.
5. Deliver with final handoff message.

### Final Handoff Message (exact wording)

> "Final video not rendered by Claude. Import this ZIP into FramePilot Studio and click **RENDER VIDEO**."

---

## Abort Conditions (Blocking — Do Not Produce ZIP)

| Condition | Reason |
|-----------|--------|
| CSV parse failure (zero valid rows) | No timing data — cannot build scenes |
| Total duration = 0ms | No composition possible |
| Script is empty or null | No editorial content |
| `src/index.tsx` or `Root.tsx` could not be written | Invalid Remotion entry |
| Scene coverage fails (words missing) | Incomplete composition |

When aborting, report the blocking condition clearly. Do not deliver a partial ZIP with broken compositions.

---

## Recoverable (Non-Blocking) Errors

| Condition | Recovery |
|-----------|----------|
| Missing optional image | Use CSS gradient placeholder, log to decision log |
| SFX generation failed | Skip that SFX event, note in QA report |
| Font unavailable | Fall back to `system-ui`, log decision |
| CSV drift > 2000ms but < 5000ms | Use CSV as source of truth, log advisory |
| Some words have timing = 0 | Assign to nearest scene, log count |

---

## Decision Log

Every non-trivial choice must be recorded in `project-data/decision-log.json`.

### Decision Log Schema

```json
{
  "projectId": "framepilot-project-001",
  "entries": [
    {
      "id": "d-001",
      "phase": "phase-0",
      "timestamp": "2024-01-15T09:30:12Z",
      "category": "asset",
      "decision": "Image 'map-1971.jpg' not supplied. Using CSS gradient placeholder for scene-005.",
      "impact": "non-blocking",
      "alternativeConsidered": "Requested user to upload — rejected per NARRATION_ASSET_BINDING rules"
    },
    {
      "id": "d-002",
      "phase": "phase-1",
      "timestamp": "2024-01-15T09:31:05Z",
      "category": "timing",
      "decision": "CSV drift of 400ms vs narration. Within tolerance. Using CSV end time.",
      "impact": "advisory"
    }
  ]
}
```

### Required Decision Log Categories
- `asset` — asset resolution decisions
- `timing` — timing or duration choices
- `scene` — scene boundary or type assignment choices
- `visual` — visual direction choices not obvious from defaults
- `typography` — font fallback or text truncation
- `sfx` — SFX selection or skipped events
- `error-recovery` — any error recovery actions

---

## One-Pass Execution Contract

Claude **does not iterate back** to earlier phases except on a blocking error. The pipeline is:

```
Inventory → Audit → Analyze → Plan → Direct → Code → QA → ZIP
```

If a mid-pipeline issue is discovered (e.g., an asset turns out to be corrupt during Phase 5), log the recovery to the decision log and continue. Do not restart the pipeline. Do not ask the user for clarification on issues that have documented defaults.

---

## Cross-References

- CSV parsing rules → `WORD_TIMING_CSV_CONTRACT.md`
- Narration binding → `NARRATION_ASSET_BINDING.md`
- Scene planning algorithm → `SCENE_PLANNING.md`
- Script analysis methods → `SCRIPT_ANALYSIS.md`
- ZIP structure → `PROJECT_PACKAGING_CONTRACT.md`
- QA checklist → `STATIC_QA_AND_DELIVERY.md`
- Error classes → `ERROR_RECOVERY_AND_DELIVERY.md`
