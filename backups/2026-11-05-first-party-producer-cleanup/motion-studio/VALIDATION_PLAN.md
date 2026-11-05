# Motion Studio Validation Plan

## Overlay installation
- [ ] Extract the ZIP into the existing FramePilot Studio project root; do not replace existing source folders.
- [ ] Run `tools/APPLY_MOTION_STUDIO_OVERLAY.bat`.
- [ ] Confirm timestamped backups exist under `backups/motion-studio-overlay/`.
- [ ] Run the installer a second time; verify no duplicate navigation, stylesheet, script, preload API or main-process service hook appears.
- [ ] Verify the installer refuses an unexpected source anchor without writing a partial patch.
- [ ] Verify `src/renderer/app.js`, `backend/framepilot/*`, the Filmora WFP engine and root `Master_promt.txt` are unchanged.

## Filmora regression gate
- [ ] Overview loads.
- [ ] Script-to-Image Mapping behaves exactly as before.
- [ ] Audio to CSV still produces the original 21-column Filmora/EMS Final Master CSV.
- [ ] Filmora WFP analysis/export and existing effects remain unchanged.
- [ ] Activity & QA, Settings, Help and update behavior still work.

## Motion Word Timing
- [x] Five-column CSV schema fixture tests.
- [x] Case/punctuation normalization fixture.
- [x] Repeated word intervals remain separate and ordered.
- [x] Missing and extra words are QA-flagged; no synthetic timestamps are inserted.
- [x] CSV and companion QA JSON output fixture.
- [ ] Script/audio selectors tested with Unicode and long paths.
- [ ] Real English voiceover alignment with the packaged offline model.
- [ ] Bengali readiness/model test. Do not claim support unless a real compatible model passes.
- [ ] Test empty alignments, audio shorter than script, long silence, overlapping/invalid timestamps and low-confidence words.

## Project ZIP import
- [x] Valid sample project passes static validation and imports.
- [x] ZIP traversal rejected.
- [x] Symbolic links rejected.
- [x] `node_modules` rejected.
- [x] Unapproved dependency rejected.
- [ ] Absolute/drive path, ADS, duplicate/case-collision path, ZIP bomb and executable-file fixtures.
- [ ] Validate exact assets and all source imports in a representative upstream-derived Remotion project.
- [ ] Confirm no project code or npm lifecycle script executes during inspection or extraction.

## Remotion runtime and rendering
- [x] Private Node runtime works in this Windows x64 checkout (`v22.23.4`).
- [x] Remotion renderer and all `@remotion/*` versions match `4.0.540`.
- [x] `@remotion/compositor-win32-x64-msvc` is present and its native binaries/DLLs load.
- [x] Chrome Headless Shell starts in the local offline smoke test (`157.0.8103.38`).
- [x] Sample project bundles with the worker's explicit `rootDir` and resolves the manifest Composition ID.
- [ ] Still-frame output is generated and visually reviewed. (Generated; visual review remains manual.)
- [ ] Low-resolution MP4 preview plays in the Motion Preview screen.
- [x] Full-quality silent fixture MP4 renders and passes FFprobe duration/size verification; audio/SFX playback is not tested.
- [ ] Progress is based on actual renderer callbacks; cancellation kills the full worker tree.
- [ ] Existing output collision is handled without overwrite.
- [ ] 20-minute video stress test for RAM, disk and render duration.

## Worker security
- [ ] Enforced project-only filesystem scope on Windows.
- [ ] Network deny tests include external URLs and local services.
- [ ] Deny reads of user profile, secrets, sibling projects and startup folders.
- [ ] Deny arbitrary process execution and ensure children inherit restrictions.
- [ ] Only after passing, write the validated worker policy. A JSON file alone is not a sandbox.

## Packaging and release
- [ ] Existing Electron Builder resources are preserved.
- [ ] Motion resources are included without overwriting Filmora files.
- [ ] Filmora-only development build succeeds with Motion runtime absent.
- [ ] Production preflight requires every Motion runtime dependency before claiming Motion Render ready.
- [ ] Clean Windows install/uninstall and runtime test.
- [ ] Third-party license/model notices and Remotion license eligibility reviewed before distribution.
