# Copilot Final Integration Task — FramePilot Motion Studio

You are completing an additive Motion Studio integration in the existing FramePilot Studio v0.1.4 source tree. Read this entire brief, `motion-studio/README_FIRST.md`, all files under `motion-studio/prompts/`, and the actual downloaded upstream Skill source before changing code.

## Non-negotiable scope

1. Filmora Studio is frozen for this task. Do not alter its four workflows, UI behavior, existing 21-column Final Master CSV, EMS mapping, audio engine, WFP analysis/export, effects, outputs or prompts.
2. Motion Studio is a separate workspace with a separate schema, word-timing engine, project manager, import flow, preview flow and render flow.
3. Do not replace, rename or modify the existing root `Master_promt.txt`.
4. Do not change Microsoft Store listing, repository visibility, signing identities, GitHub publishing settings or release catalogue.
5. Do not claim that Motion runtime, a language model, Player preview, or rendering is ready until the actual component has been installed and tested.
6. Never set `runtime/motion/security/worker-policy.json` to `validated` unless actual OS-level isolation is implemented and the denial tests pass. A policy JSON file alone is not a sandbox.

## Source files included by the overlay

- `src/renderer/motion-studio/motion-studio.js`
- `src/renderer/motion-studio/motion-studio.css`
- `src/main/motion-service.js`
- `backend/motion/bridge.py`
- `backend/motion/word_timing_engine.py`
- `backend/motion/project_import.py`
- `runtime/motion/renderer/package.json`
- `runtime/motion/renderer/runner.mjs`
- `runtime/motion/security/worker-policy.template.json`
- `motion-studio/prompts/*`
- `tools/apply-motion-studio-overlay.cjs`

The double-click installer `tools/APPLY_MOTION_STUDIO_OVERLAY.bat` adds hooks to the existing app. It is designed to modify only `src/renderer/index.html`, `src/main/main.js`, `src/preload/preload.js`, and `package.json`, with backups. Verify its hooks exactly once. Do not re-run a broad merge or replace source folders.

## A. Audit the upstream Claude Remotion Skill

Use the exact downloaded source at `third_party/claude-remotion-skill/upstream/` and the public reference https://github.com/haidrrrry/claude-remotion-skill.

- Preserve original upstream files and MIT license/attribution.
- Audit `remotion-motion-graphics/SKILL.md`, `references/motion-patterns.md`, `references/design-rules.md`, `assets/theme.ts` and the examples project.
- Curate reusable patterns into FramePilot-owned modules only after reviewing their dependencies and license notices.
- Do not copy large demo MP4/GIF assets into the end-user installer unless actually needed.
- Reconcile the upstream pattern imports against the exact approved package allowlist in `runtime/motion/renderer/package.json`. If an upstream pattern imports a package not already bundled, either port the pattern without it or review, pin, license and test the dependency before adding it.

## B. Verify the two-workspace UI integration

- Confirm Filmora's four workflows still appear and work exactly as before.
- Confirm the Motion navigation and five Motion screens appear: Motion Overview, Word Timing, Claude Project Kit, Project Import, Preview & Render.
- Confirm the FramePilot dark graphite / gold / ruby visual identity is retained.
- Confirm the Motion stylesheet and script load exactly once and no Content Security Policy rule blocks the local `framepilot://motion-output/` MP4 preview. Do not weaken script, network or frame restrictions broadly.
- Confirm prompt cards can copy and save each `.md` file. Confirm the master prompt action copies the new Motion prompt and opens Claude without uploading user files.
- Confirm the shared Activity & QA log displays Motion diagnostics without overwriting or changing Filmora job state.
- Keep Filmora navigation, labels and behavior unchanged apart from the new visual grouping label.

## C. Validate IPC and main/preload boundaries

- Audit every `motion:` IPC handler against the exact preload API exposed by the overlay.
- Maintain main-frame/sender validation in the existing `handle()` wrapper.
- Do not expose `ipcRenderer`, arbitrary paths, `fs`, `spawn`, or a generic command runner to the renderer.
- Validate all source paths, output paths, extensions, file existence and project-root containment in the main process.
- Keep Motion job state separate from Filmora's `activeChild` and job state.
- Verify cancellation stops the full child-process tree and emits the truthful cancelled status.
- Verify the custom `framepilot://motion-output/` protocol can serve only files beneath `Documents/FramePilot Studio/Motion Projects/`.

## D. Complete the independent Motion Word Timing engine

- Use `backend/motion/word_timing_engine.py` and the Motion bridge; do not call the Filmora phrase matcher, Final Master CSV writer, or WFP engine.
- Reuse lower-level WhisperX/FFmpeg/model packages only if version compatibility is proven. Keep Motion data outputs and settings independent.
- Build a separate Motion backend package at `runtime/motion/backend/FramePilotMotionBackend.exe` or a private Python runtime at `runtime/motion/python/python.exe`. Preserve the exact Motion bridge CLI contract.
- Include dependencies required for script parsing (`pypdf` for PDF) and the exact WhisperX/PyTorch/torchaudio/VAD/aligner stack. Model files must be local and verified by the runtime manifest/hashes.
- Validate language/model readiness. Do not label Bengali as supported until a compatible offline Bengali word aligner is installed and tested on actual Bengali voiceovers. Unsupported languages must fail with a clear message.
- Test punctuation/case normalization, repeated words, script omissions, extra spoken words, substitutions, low confidence, confidence-unavailable words, blank alignment, silence and duration boundaries.
- The Motion CSV must retain exactly five columns in order: `Word_Index`, `Script_Word`, `Recognized_Word`, `Start_ms`, `End_ms`. Diagnostics belong in `.QA.json`.
- Never estimate or fabricate missing/uncertain timestamps. Keep missing values blank and mark QA review.

## E. Harden static project ZIP validation

- Validate archive traversal, absolute and drive-qualified paths, backslashes, Windows ADS, duplicate normalized paths, symlinks, duplicate files, ZIP bombs, file-count/size limits and invalid ZIPs.
- Reject `node_modules`, `.git`, virtual environments, executable/installer binaries and unapproved dependency declarations.
- Require the root `motion-project.json`, `package.json`, the exact entry-point file, composition ID, valid dimensions/FPS/duration, local voiceover/word timing and all declared assets.
- The initial approved runtime package set is pinned in `runtime/motion/renderer/package.json`; all `@remotion/*` packages must be the exact same version (`4.0.540`) and React/React DOM must match the runtime lock.
- Do not execute imported JavaScript during inspection/extraction. Do not run arbitrary `npm install`, package lifecycle scripts or other project code.
- Use temporary extraction and re-validation; never let extraction escape the Motion Projects root.
- Report missing or unsupported source imports and assets before render.

## F. Complete the private Remotion runtime

The initial runtime package definition is at `runtime/motion/renderer/package.json`; the worker is `runtime/motion/renderer/runner.mjs`.

- Pin and lock the exact dependencies. Install the Windows x64 `@remotion/compositor-win32-x64@4.0.540` package. This platform package includes Remotion's FFmpeg/FFprobe, native Rust renderer and platform libraries; do not replace it with an arbitrary standalone FFmpeg build.
- Stage a private, compatible Windows x64 Node executable at `runtime/motion/node/node.exe`.
- Stage a compatible Remotion Chrome Headless Shell at `runtime/motion/browser/chrome-headless-shell.exe`. Do not depend on first-run network downloads.
- Verify the worker package, compositor version, browser path and all native DLLs on a clean Windows 10/11 x64 machine.
- Keep imported-project dependencies restricted to the exact package allowlist; no per-project package installation.
- The runner must bundle using `@remotion/bundler` with the runtime as `rootDir`, select the exact Composition ID, verify manifest dimensions/FPS/duration, render a low-resolution MP4 preview and a final MP4, and create still frames for QA.
- Keep bundle/cache/output paths controlled. Do not overwrite prior render outputs. Add robust error messages and actual progress events.
- Implement full cancellation and verify that no Node/Chromium child process remains after cancellation.

## G. Implement and validate project-code isolation before enabling Render

Imported Remotion projects contain executable JavaScript/TypeScript. Do not run them inside Electron's main process or the privileged renderer.

- Implement a separate worker boundary that has read access only to the selected project and runtime packages, write access only to its bundle/cache/output locations, and no network access.
- Use enforceable Windows OS isolation (not just an environment variable or JSON flag). Review filesystem and network restrictions, process execution, inherited handles and child-process behavior.
- Test attempted access to parent folders, user profile, other projects, startup folders, environment secrets, network URLs, local web services and arbitrary executables. Every prohibited attempt must be denied.
- If strong OS-level isolation is not available, keep `motion:start-render` locked and report that honest limitation. Do not use the template policy to unlock it.

## H. Preview behavior

- The overlay's first preview implementation is a rendered low-resolution MP4 displayed in the app's video element. It is not a live `@remotion/player` preview.
- Keep that distinction clear in UI and runtime status.
- If you implement live Player preview later, build a separate sandboxed React preview module; compile the project first and supply a real React Composition component. Never pass a ZIP directly to Player.

## I. Package and release integration

- Keep all existing electron-builder resources. The overlay appends `backend/motion`, `motion-studio/prompts` and `runtime/motion` resources only.
- Extend release preflight with an independent Motion runtime check so Filmora-only development still works without Motion runtime binaries.
- A production installer must not advertise Motion Render ready unless the private Node, renderer packages, compositor, browser, Python backend, required language models and worker isolation tests all pass.
- Preserve all existing code-signing and Store configuration. Do not publish or change repository visibility.
- Complete dependency/model licensing and update third-party notices before any public or commercial distribution.

## J. Test plan and final report

Run and report the actual results of:
- `node --check` on main, preload, app, Motion UI, Motion service, runner and overlay installer.
- Python compile and the new Motion unit tests.
- Overlay installer on a clean copy of the exact target source; run it twice and verify there are no duplicate hooks.
- Regression testing of all four Filmora workflows.
- Motion CSV fixtures, script/audio mismatch fixtures and one real English alignment audio.
- Bengali support/readiness test; report unsupported unless a real model passed.
- Project ZIP safe/unsafe fixtures.
- Sample Remotion project static import, bundle, still frame, preview MP4, final MP4, audio playback and cancellation.
- Clean Windows packaging test and 20-minute project resource/performance test.

### Final handoff

Provide files changed, tests run and results, supported alignment languages and model identifiers, runtime versions, browser/compositor status, preview type, sandbox enforcement evidence, package/license notes and installer readiness. If any required component is missing, keep Motion Render marked unavailable. Do not simulate test success.
