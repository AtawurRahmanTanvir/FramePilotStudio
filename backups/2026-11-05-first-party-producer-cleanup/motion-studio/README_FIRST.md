# FramePilot Studio — Motion Studio Overlay

This ZIP adds an independent Motion Studio workspace to the existing FramePilot Studio source tree. It is an additive overlay, not a replacement application and not a Filmora rewrite.

## Important scope boundary

- The existing Filmora Studio workspace is preserved: its four workflows, EMS/Filmora CSV, current audio pipeline, WFP engine, effects and outputs remain separate.
- Motion Studio has its own five-column Word Timing CSV, script/audio verification, project library, first-party Claude Project Kit, ZIP importer and guarded Render Video action.
- The existing root `Master_promt.txt` is not changed.
- The overlay installer only patches `src/renderer/index.html`, `src/main/main.js`, `src/preload/preload.js` and `package.json`. It does not modify the existing Filmora `src/renderer/app.js`, Filmora Python engine or WFP engine.

## Install the overlay

1. Close FramePilot Studio and make a backup of the complete source folder (or commit your current Git changes).
2. Extract this ZIP into the root of the current `FramePilotStudio` source folder. Merge the new folders. Do not replace or delete the complete `src`, `backend`, `runtime` or `tools` folders.
3. Double-click `tools/APPLY_MOTION_STUDIO_OVERLAY.bat` from the extracted project. It uses the Node.js already required by the FramePilot development toolchain. No manual PowerShell command is required.
4. The installer verifies the expected source anchors, stages the patch, and creates backups under `backups/motion-studio-overlay/<timestamp>/` before changing any existing file.
5. Open the source folder in Copilot. Use the first-party resources under `product-assets/motion-producer/` and the current integration reports.

The installer is idempotent: rerunning it does not duplicate navigation, script, stylesheet or IPC hooks. It stops rather than guessing when it cannot find the expected v0.1.4 source anchors.

## What the overlay adds

- A new MOTION STUDIO navigation group with Motion Overview, Word Timing, Claude Project Kit, Project Import, and Render Video screens.
- A separate Motion IPC service and a restricted preload API.
- A separate Python word-timing engine that outputs `Word_Index, Script_Word, Recognized_Word, Start_ms, End_ms` plus a companion `.QA.json` report.
- A ZIP validator/importer that checks archive paths, symlinks, duplicate paths, archive size, manifest, and pinned dependencies without executing imported code.
- A pinned Remotion 4.0.540 worker package definition and programmatic bundling/render runner.
- A first-party Motion Producer Skill, Project Instructions, per-video handoff, schemas, validators and templates under `product-assets/motion-producer/`.
- A separate local project folder: `Documents/FramePilot Studio/Motion Projects/`.

## What is not bundled or certified yet

This overlay does not include your WhisperX model weights, language aligner models, a private Node executable, Chrome Headless Shell, the Windows Remotion compositor package installation, or an enforced Windows sandbox. The renderer intentionally remains unavailable until Copilot builds and validates those components. A policy JSON file by itself is not proof of isolation.

The initial Remotion fallback preview is a low-resolution MP4 rendered by the local worker. The `@remotion/player` dependency is staged for a later embedded live-preview module; it is not represented as an already-working live Player in this overlay.

Bengali word alignment must not be labelled supported until a compatible offline aligner has been installed and tested against real Bengali voiceovers. The engine reports unsupported languages instead of fabricating timestamps.

## First-party Motion Producer resources

The application packages the editable Skill and generated upload archive from
`product-assets/motion-producer/`. The historical `third_party/claude-remotion-skill/`
copy is not a runtime dependency and is not required for the Claude Project Kit.

## Next step

Use `motion-studio/COPILOT_FINAL_INTEGRATION_TASK.md` as the final engineering brief. Copilot must run the tests in `motion-studio/VALIDATION_PLAN.md`, report actual results, and keep Motion Render disabled if any required runtime, language model or sandbox component is missing.
