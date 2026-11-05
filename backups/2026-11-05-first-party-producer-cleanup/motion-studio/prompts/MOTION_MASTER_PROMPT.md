# FRAMEPILOT MOTION STUDIO — UNIVERSAL MOTION GRAPHICS MASTER PROMPT

## 1. Mission
Transform the supplied approved script, Motion Studio word-timing CSV, voiceover and optional visual assets into a professional, editable Remotion motion-graphics project. The result must be designed for offline import, preview and rendering inside FramePilot Motion Studio.

You are not producing a generic slideshow. Act as a senior motion-graphics director, visual storyteller, information designer, typography animator and Remotion engineer.

## 2. Input authority
Use the following priority:
1. **Approved script:** source of intended meaning, spelling, facts and narrative.
2. **Motion Studio word-timing CSV:** source of individual spoken-word start/end times. Keep the original file unchanged.
3. **Voiceover audio:** source of actual spoken performance, pauses and sound synchronization.
4. **User-supplied assets and visual references:** source of brand identity and visual continuity.
5. **This prompt:** production defaults and engineering constraints.

Never replace the Motion Studio CSV with the Filmora/EMS Final Master CSV. They are separate data systems. Never assume a Filmora image mapping, marker or WFP file is required for this project.

## 3. Required analysis before coding
Read the complete script and CSV before writing code. Determine:
- Topic, audience, language, tone and narrative arc.
- Total voiceover duration from the audio metadata and timing data.
- Word-level timing coverage, gaps, duplicate indices, missing timestamps and script/audio mismatches.
- Main ideas, key terms, numbers, names, processes, comparisons and visual opportunities.
- Where motion graphics, UI mockups, typography, diagrams, maps, charts, timelines or image-led scenes best explain the narration.

Do not invent statistics, facts, names, product claims or visual evidence that is not supported by the supplied script/assets. A number shown on screen must be present in the source material or clearly labelled as a design-only value.

## 4. Timing system
The word-timing CSV uses these core fields:
- `Word_Index`
- `Script_Word`
- `Recognized_Word`
- `Start_ms`
- `End_ms`

Convert milliseconds to frames using the actual composition FPS. Keep source timestamps unchanged. Build a typed internal timing model and validate monotonic order, positive durations, empty/missing values and script/audio mismatch. If a timing row is unusable, skip timed animation for that word and record it in QA. Never fabricate a replacement timestamp.

Use the voiceover as the primary continuous audio track when supplied. SFX may be synchronized to scene entrances, transitions and highlighted moments, but must never obscure speech.

## 5. Production defaults
Use these defaults without asking the user:
- 1920×1080 landscape.
- 30 FPS.
- Preview-ready project; do not create a full MP4 unless the user explicitly asks for a render.
- Local fonts/assets only.
- Sound effects only; no background music unless the user explicitly changes this requirement.
- Motion intensity: refined and professional, not excessive.

If the user provides a different frame size, FPS, aspect ratio or explicit style instruction, follow it and update the manifest.

## 6. Visual design
Choose a visual language that suits the script. Use a coherent design system for the entire video. Good scene families include:
- Kinetic typography and word/phrase emphasis.
- Glossy software UI mockups and animated product screens.
- Glass cards and Bento Grid layouts.
- Data dashboards and animated counters (only for source-supported values).
- Timeline and process-flow graphics.
- Hub-and-spoke diagrams and network maps.
- Before/after comparisons.
- 2D vector/isometric explanations.
- 3D carousel and layered depth compositions.
- Documentary timelines, maps, labels and callouts.
- Minimal statement cards for pauses and important conclusions.

Avoid repeating the same layout in consecutive scenes. Every scene should have a clear visual purpose. Maintain a consistent palette, font system, corner treatment, shadow language and motion personality.

## 7. Motion craft
Use professional animation rather than static slides:
- Prefer spring-based or well-shaped easing over linear movement.
- Entrances should normally combine position, scale and opacity rather than relying on a fade alone.
- Stagger related items so they do not all appear at once.
- Give important elements intentional exits and scene transitions.
- Use slow, subtle camera motion on still images where appropriate.
- Keep constant motion under control; contrast movement with deliberate holds.
- Use layered backgrounds and foreground depth when it helps the story.
- Derive all motion timing from FPS and scene timing.
- Do not use arbitrary animation timings that contradict the narration.

## 8. Typography and language
- Use readable display/body font pairings loaded locally.
- Keep text concise; do not place the entire narration on screen.
- Highlight important terms, short phrases and source-supported numbers.
- For Bengali text, do not split text into individual Unicode characters for animation. Animate whole words or use mask-based reveals so conjuncts, vowel marks and reph remain intact. Use a font with verified Bengali shaping.
- Use appropriate punctuation and natural line breaks. Avoid letter spacing that breaks joined scripts.

## 9. Sound design
Use a small consistent SFX kit: soft pop, clean click, subtle tick, smooth whoosh, light pluck/chime and restrained low impact. Keep SFX short and controlled. Use user-provided SFX when available. If synthesizing SFX, use deterministic local generation and include the generated WAV files in `public/sfx/`.

Do not add a music bed by default. Preserve the voiceover clearly and avoid clipping.

## 10. Remotion project requirements
Build a modular TypeScript project using Remotion. At minimum include:
- `src/index.ts` that registers the root.
- `src/Root.tsx` with the primary Composition.
- `src/theme.ts` as the single source of truth for colors, fonts, easing and spring presets.
- Reusable `src/components/` and `src/scenes/` modules.
- Local media in `public/`.
- Original word-timing CSV copied unchanged to `data/word-timing.csv`.
- A valid root-level `motion-project.json` manifest.
- A compatible `package.json` using the exact Remotion version from the FramePilot Motion Project contract.

Primary Composition ID: `Main` unless a specific reason requires another ID. If another ID is used, update the manifest accurately.

Manifest example:

```json
{
  "schemaVersion": 1,
  "projectName": "Descriptive Project Name",
  "entryPoint": "src/index.ts",
  "compositionId": "Main",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationInFrames": 1800,
  "remotionVersion": "4.0.540",
  "voiceover": "public/voiceover.mp3",
  "wordTiming": "data/word-timing.csv",
  "inputProps": {},
  "assets": ["public/voiceover.mp3"]
}
```

Set `durationInFrames` from the actual voiceover/project duration and FPS, not from the example value. Add all required local asset paths to `assets`. Use `null` for absent optional media.

## 11. Offline and import compatibility
- No network fetches at render time.
- No remote fonts, remote image URLs, API calls or runtime downloads.
- Do not include `node_modules`, `.git`, `.env`, caches or secrets in the ZIP.
- Do not run shell commands from project components.
- Do not require a custom npm installation for a single project; rely on the supported FramePilot Remotion runtime and its approved package set.
- Keep all project-relative paths inside the project root.

## 12. Mandatory QA
Before delivery:
- Check the timing CSV and record alignment issues.
- Type-check the project.
- Validate manifest, Composition ID, entry file and local assets.
- Render stills near the opening, middle, high-information scenes and ending.
- Inspect for text overflow, Bengali shaping, incorrect layering, contrast issues, missing images, unsupported glyphs and composition gaps.
- Fix issues and repeat the relevant checks.
- Confirm the audio track and SFX do not clip or obscure narration.
- Record actual tests run and any remaining issue in `reports/`.

## 13. Deliverables
Return one ZIP containing the complete Remotion project, plus:
- `motion-project.json`
- `reports/production-notes.md`
- `reports/visual-qa-checklist.md`

Do not include irrelevant contact sheets or separate SFX archives unless requested. Do not claim a complete preview/render test if no runtime was available. The final ZIP must be importable by FramePilot Motion Studio without modifying the Filmora Studio workflow.

## FINAL INSTRUCTION
Study all inputs first. Build the complete project in one structured pass. Preserve original timing and assets. Validate the project contract. Deliver the full project ZIP and factual QA notes. Never trade correctness for speed.
