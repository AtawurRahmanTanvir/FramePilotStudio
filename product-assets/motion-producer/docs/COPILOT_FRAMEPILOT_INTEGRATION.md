# Copilot Implementation Brief — Add FramePilot Producer Kit to Motion Studio

## Goal

Integrate the FramePilot Motion Producer Pro workflow into the existing Motion Studio **Claude Project Kit** page. Do not rebuild Motion Studio. Do not touch Filmora Studio. Do not enable imported-project rendering or bypass security.

## User-facing actions

The Claude Project Kit page should expose a small, direct group of actions:

1. **Copy Master Instructions** — copy complete persistent project instructions to clipboard.
2. **Save Master Instructions** — save the instruction file through Electron's native save dialog to a user-selected path.
3. **Save Producer Skill** — copy the packaged custom Skill ZIP from app resources to a user-selected path.
4. **Save Project Link / Open Claude Project** — let the user save their own private Claude Project URL once, then open that exact URL in the system browser. If no URL is saved, open the Claude homepage and explain how to configure it.
5. **Copy Per-Video Handoff** — copy the short one-pass production request.

The page should state that setup is one-time; for each new video the user uploads script + voiceover + FramePilot CSV + assets and invokes the Skill.

## Required files to package

- `claude-project/PROJECT_INSTRUCTIONS.md`
- `claude-project/PER_VIDEO_INTAKE.md`
- `Claude_Skill_Upload.zip`
- `metadata/VERSION.json`
- `docs/MOTION_STUDIO_CLAUDE_KIT_UI_SPEC.md`

Use the app's existing resource/asset packaging convention. Do not hardcode development-only absolute paths. In packaged builds resolve assets through the existing `process.resourcesPath` strategy or current project resource resolver.

## Security and IPC

- Keep Electron context isolation enabled.
- Expose narrow preload methods only.
- Copy through the app's existing safe clipboard mechanism.
- Save via `dialog.showSaveDialog` and a trusted main-process file copy/write.
- Do not accept arbitrary source paths from renderer input.
- Do not execute the Skill scripts inside the Electron process.
- Do not read or upload user script/audio/media automatically.
- `Open Claude` should open `https://claude.ai/` through the app's existing safe external URL policy. It does not auto-attach the files or navigate to a private project.

## UI scope

Keep the page simple. Do not add a live preview, timeline, advanced editor, render dashboard or complicated configuration panel. The user's local final render remains a separate one-click action on the Render Video page.

## Preserve existing features

Do not break Word Timing, CSV/QA export, project import, project library, Runtime Manager, Render History, or the single `RENDER VIDEO` action. Do not modify Filmora source files, its schema, WFP processing or 21-column Final Master CSV.

## Acceptance tests

- Instructions copy exactly and preserve UTF-8 Bengali/English text.
- Save dialog writes the exact resource bytes and handles cancellation safely.
- Skill ZIP saved from installed resources is byte-identical to the packaged resource.
- Open Claude opens the official domain only.
- No user assets or project data are transmitted.
- Script + voiceover upload still generates the canonical five-column Motion CSV and QA JSON in Word Timing.
- App packaged build resolves files correctly.
- Motion tests pass and Filmora regression tests remain unchanged/passing.
- `git diff --check` passes.

## Delivery report

List the files changed, tests actually run, resource packaging changes, UI behavior and any limitations. Do not commit, push, publish or alter signing configuration without permission.


## Preserve the existing fast Script + Voiceover → CSV workflow

The user should continue to create timing data directly inside FramePilot: upload the approved script and matching voiceover in Word Timing, run the local alignment workflow, and export the canonical CSV plus QA JSON. Do not require the user to author CSV manually. Claude consumes that CSV; it does not replace the alignment engine. Keep the exact five-column header and never convert the Motion CSV into SRT/VTT. Preserve the existing language/model capability gates; do not claim Bengali alignment readiness unless the actual model passes real test audio.

## Saved Claude Project link (important)

An individual Claude Project URL is private and user-specific. Do not invent one, derive one from an account ID, or assume the generic Claude homepage is the user's project.

Add a user-configurable **Claude Project URL** field and a **Save Project Link** action. Validate that the entered URL is HTTPS and its hostname is exactly `claude.ai` or `www.claude.ai`. Store it in the app's per-user settings using the existing safe settings mechanism. Do not store it in the packaged project or logs.

The **Open Claude Project** button should:

- Open the saved URL with the system browser if one exists.
- Otherwise open `https://claude.ai/` and explain that the user must set their project link once.
- Never attach or upload script, audio, CSV or assets automatically.
- Reject non-Claude domains, embedded credentials, `javascript:`, `file:`, custom protocols and malformed URLs.

The URL field is a convenience only. The user still uploads the per-video inputs into Claude manually. The app must not imply that the link or Skill upload automatically transfers files.
