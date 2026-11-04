# Upstream Claude Remotion Skill — Local Setup Guide

Reference repository: https://github.com/haidrrrry/claude-remotion-skill

Keep the original downloaded repository isolated at:

`third_party/claude-remotion-skill/upstream/`

Create the `upstream` folder, open the downloaded GitHub ZIP, open its top-level `claude-remotion-skill-main` folder, and extract/copy the CONTENTS of that folder directly into `upstream`. The expected path is `upstream/remotion-motion-graphics/SKILL.md` (not an extra nested `upstream/claude-remotion-skill-main/` level).

Preserve its `LICENSE`, `README.md`, original `remotion-motion-graphics/`, `examples/` and source history. Do not move its files into the existing Filmora source folders. Do not copy the large demo MP4/GIF into the final FramePilot installer unless specifically needed.

## Recommended curated layout

```text
third_party/claude-remotion-skill/
  upstream/                    # exact downloaded source; preserve unchanged
  AUDIT.md                     # which files are reused and why
  LICENSE                      # upstream MIT license copy
```

FramePilot-owned code should be placed in `src/renderer/motion-studio/`, `backend/motion/`, `runtime/motion/` and `motion-studio/`. Do not edit the upstream folder to make it fit the application.

## Claude Project setup
1. Create a Claude Project for the relevant video-production workflow.
2. Add `CLAUDE_PROJECT_INSTRUCTIONS.md` as Project Instructions/Knowledge.
3. Upload `MOTION_MASTER_PROMPT.md` when starting a new project, or keep it in Project Knowledge if that is the user's preferred workflow.
4. Upload the approved script, Motion Studio Word Timing CSV, voiceover and any optional assets.
5. Ask Claude to follow the Master Prompt and produce a FramePilot-compatible Remotion ZIP containing `motion-project.json`.

The prompt and instruction files can be copied from the app UI or saved to disk. FramePilot does not send files to Claude automatically and does not require a Claude API key.
