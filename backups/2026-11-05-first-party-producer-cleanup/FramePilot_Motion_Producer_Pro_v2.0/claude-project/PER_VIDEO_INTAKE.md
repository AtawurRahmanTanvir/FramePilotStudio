# Per-Video Intake / Production Request

Upload the files for one video, then send this request. The Skill should inspect files and resolve known settings itself; this checklist is a production manifest, not a questionnaire to fill out when the information is already in the brief.

## Files to attach

- [ ] Approved script.
- [ ] Matching final voiceover.
- [ ] FramePilot word timing CSV (`Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms`).
- [ ] FramePilot `.QA.json`, if exported.
- [ ] All mandatory visual assets, with original names/numbers.
- [ ] Reference image(s), brand guide, production bible and factual source notes.

## Production command

> Use `/framepilot-motion-producer`. Produce the complete FramePilot-compatible Remotion project in one pass. Audit the full script and voiceover, validate the exact CSV, preserve every mandatory supplied asset and original serial number, create a complete scene/asset/timing/continuity map, implement the full modular Remotion project, run static QA and deliver exactly one import-ready project ZIP. Do not render any preview or final video in Claude. Do not create SRT/VTT. Do not ask me to use PowerShell or CMD. FramePilot Studio will render the final MP4 locally.

## Optional project-specific brief

- Output: 16:9 / 9:16 / 1:1 / custom (use provided settings first).
- Resolution / FPS: follow explicit project instructions; otherwise default 1920×1080 at 30 FPS.
- Captions: on / off / phrase emphasis / word emphasis.
- Music: none unless explicitly approved.
- SFX: only when permitted by the brief.
- Camera: locked / controlled / scene-specific.
- Required assets: all / selected with explicit selection rules.
- Style: use provided reference bible first.
- Special constraints: historical, legal, brand, language, continuity, image count, naming.
