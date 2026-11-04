# Copilot Task — Complete FramePilot Motion Studio Integration

Read these files completely before editing any code:

1. `motion-studio/README_FIRST.md`
2. `motion-studio/COPILOT_FINAL_INTEGRATION_TASK.md`
3. `motion-studio/VALIDATION_PLAN.md`
4. `motion-studio/prompts/CLAUDE_PROJECT_INSTRUCTIONS.md`
5. `motion-studio/prompts/MOTION_MASTER_PROMPT.md`
6. `motion-studio/prompts/PROJECT_IMPORT_CONTRACT.md`
7. `motion-studio/prompts/WORD_TIMING_CSV_SPEC.md`
8. `motion-studio/prompts/UPSTREAM_SKILL_SETUP.md`

The current FramePilot source already contains the existing Filmora Studio workflows. Preserve them exactly. Filmora Studio and its EMS/Filmora CSV, Script-to-Image, Audio-to-CSV and WFP Timeline engine are not to be refactored, replaced, merged or renamed. Motion Studio is a separate workspace, independent data pipeline and independent renderer.

The overlay installer is `tools/APPLY_MOTION_STUDIO_OVERLAY.bat`. It should already have been run. Verify that it completed and that its timestamped backups exist. Do not run destructive replacement commands and do not overwrite the user's source folder with the upstream repository.

The downloaded public Claude Remotion Skill source must be located at `third_party/claude-remotion-skill/upstream/`. Audit its original files and preserve its MIT license and attribution. Do not treat the upstream repository as a desktop editor; it is a Claude Agent Skill and Remotion example/component library.

Complete every required task in `motion-studio/COPILOT_FINAL_INTEGRATION_TASK.md`. Finish the separate Motion Word Timing backend, model/runtime integration, safe project import, Remotion bundle/renderer runtime, real progress/cancellation, output preview and production packaging. Do not claim Bengali alignment or live Remotion Player preview unless each one is actually implemented and tested.

Security is mandatory: imported Remotion projects contain executable code. Do not set the worker policy to validated or enable rendering until a real Windows-enforced project-only filesystem sandbox and outbound network denial are implemented and passed the required tests. A JSON flag, Electron sandbox, or a child process alone is not proof of isolation.

Run the complete test plan, including all four Filmora regression workflows, on a copy of the actual Windows project. Record exact test commands and outcomes. Do not fabricate successful tests. Keep render actions disabled whenever an essential runtime, language model, browser/compositor binary or security control is missing.

Do not publish commits, change GitHub visibility, remove the Microsoft Store listing, sign or distribute an installer unless the user separately authorizes those actions. First deliver a detailed integration report and a working local development build.
