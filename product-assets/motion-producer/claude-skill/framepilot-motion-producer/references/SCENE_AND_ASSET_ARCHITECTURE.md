# Scene, Narration and Asset Architecture

## 1. Build an editorial map, not a slideshow

Before writing a component, create a full narrative coverage map. A scene exists to perform a specific storytelling task: establish, question, orient, explain, compare, prove, complicate, reveal, resolve, or transition. A scene is not simply the next image in a folder.

For each script section record:

- `section_id`, heading and exact source range.
- Core claim / question / causal mechanism.
- Narration word-index range, if available.
- Actual millisecond interval if it can be grounded in valid CSV timing.
- Evidence type: supplied image, supplied footage, verified document, source-backed chart, diagram, map, kinetic type, or clearly labelled abstraction.
- Scene family and intended viewer takeaway.

Do not make a visual claim that is stronger than the script or source material.

## 2. Scene-plan object

Each item in `project-data/scene-plan.json` should include:

```json
{
  "sceneId": "scene-001",
  "sectionId": "section-opening",
  "title": "Opening question",
  "narrativeFunction": "hook",
  "startMs": 0,
  "endMs": 5200,
  "startWordIndex": 1,
  "endWordIndex": 18,
  "assetIds": ["IMG_0001"],
  "visualClaim": "A camera system made photography accessible.",
  "evidenceType": "supplied-image",
  "composition": {"focalSubject": "camera", "hierarchy": ["hero", "context", "label"]},
  "camera": {"mode": "locked", "reason": "match master reference"},
  "motion": {"entrance": "masked-reveal", "emphasis": "restrained-scale", "exit": "cut-on-idea"},
  "onScreenText": [],
  "audioEvents": [],
  "continuityRules": ["preserve viewpoint"],
  "sourceEvidence": ["script paragraph 1"],
  "confidence": "grounded",
  "openIssues": []
}
```

Fields may be extended, but do not remove stable IDs, narrative purpose, time, asset references, continuity constraints or evidence.

## 3. Scene boundary logic

Prefer boundaries at:

- A sentence that introduces a new idea.
- A cause/effect turn.
- A new year, company phase or historical era.
- A transition from claim to supporting evidence.
- A visual analogy that explains an otherwise abstract mechanism.
- A comparison where the viewer must hold both sides in view.
- A pause or reveal in the narration.

Avoid:

- Fixed 5-second cuts irrespective of meaning.
- One image per sentence as a universal rule.
- Repeating the same generic title card every chapter.
- Extending an asset across unrelated claims only to reduce scene count.

## 4. Asset manifest and source fidelity

Every supplied visual asset gets a record:

- `assetId` — stable internal ID.
- `sourceFilename` — exact original filename.
- `packagedPath` — local project path.
- `assetType` — image, video, audio, font, logo, data, document, other.
- `dimensions` / `duration` if available from reliable metadata.
- `role` — establishing, hero, detail, evidence, process, map, portrait, texture, overlay.
- `sceneIds` — every use.
- `sequenceNumber` — original numeric serial when present.
- `preservationConstraints` — camera, geography, crop, identity, chronology, trademark.
- `included` and `exclusionReason`.

A supplied image not selected for a scene is not silently forgotten. Keep it in the manifest with an exclusion reason. If the creative brief requires all supplied images, exclusions are not permitted unless the user authorizes it.

## 5. Continuity register

For projects where the same location/product/person/character appears across many scenes, create a continuity record containing:

- Master reference asset ID.
- Camera viewpoint and lens/perspective description.
- Horizon and geometry anchors.
- Subject scale and relative position.
- Fixed background landmarks.
- Permitted changes across chronology.
- Prohibited drift (camera, geography, proportions, identity, silhouette).
- Allowed within-frame movement (light, weather, people, machines, environment).

For historical evolution videos, separate **world evolution** from **camera movement**. When a fixed camera is required, the architecture changes while camera, focal direction, framing, and geography remain stable.

## 6. Image-count integrity for long-form projects

Use the user's intended visual density, not an arbitrary internal limit. Calculate:

- `supplied_asset_count`
- `planned_asset_count`
- `scene_count`
- `unique_assets_used`
- `reused_asset_count`
- `unused_asset_count`
- `assets_per_minute` only as a descriptive metric, not as a quality score

For 20–30 minute documentaries, retain all mandatory images. Do not compress 500+ images into a small handful of scenes because it is easier to code. If the narration pacing means an asset cannot be shown legibly, document the conflict rather than deleting the asset.

## 7. Chart / map / numeric integrity

For every numeric visual:

- Record the source field, value, unit, reporting period and denominator.
- Distinguish nominal from real values, annual from quarterly values, and company eras/business models.
- Do not normalize incomparable datasets without a clear note.
- Do not invent gridlines, bar heights, dates or percentages as implied data.
- Design-only decorative numbers must be explicitly marked as such and should not look like evidence.

For maps, use only source-supported boundaries, routes and locations. Do not create a false geographic relationship to fill composition space.

## 8. Coverage report

`project-data/scene-coverage.csv` should include at least:

`Section_ID,Scene_ID,Start_ms,End_ms,Start_Word_Index,End_Word_Index,Asset_IDs,Visual_Function,Coverage_Status,Notes`

Coverage status values: `COVERED`, `PARTIAL`, `MISSING_SOURCE`, `NEEDS_REVIEW`. Do not label a section covered when its only planned asset is absent.
