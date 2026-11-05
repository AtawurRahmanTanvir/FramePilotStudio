# FramePilot / Claude Team Workflow

## Responsibility boundary

| Stage | Responsible system | Output |
|---|---|---|
| Script preparation | User / editorial team | Approved script |
| Voiceover recording | User / audio workflow | Local audio file |
| Word alignment | FramePilot Word Timing | Canonical CSV + QA JSON |
| Visual planning | Claude Skill | Editorial architecture, scene plan, asset map |
| Remotion coding | Claude Skill | Local project source |
| Static project checks | Skill scripts / Claude | Validation reports |
| Project packaging | Claude Skill | Import-ready project ZIP |
| Security validation | FramePilot OS boundary | Allow / block decision |
| Final MP4 render | FramePilot local renderer | Final video + FFprobe QA |
| Human review | User / editor | Change request or approval |

Claude never takes over FramePilot's render responsibility.

## One-time setup

1. Install/enable the `framepilot-motion-producer` Skill in the chosen Claude environment.
2. Add `claude-project/PROJECT_INSTRUCTIONS.md` to the persistent Claude Project Instructions area.
3. Keep the project files and team style references in the Claude Project knowledge area, if the Claude product supports persistent project files.
4. For Claude Code, place the skill folder in the supported project or user skill directory. The slash command is derived from the Skill name.
5. Do not upload an entire private video asset library as persistent project knowledge. Upload only the current video's input files per job.

The exact menu labels can vary by Claude client/version; the package is built around the Agent Skills format, not an assumption about a fixed UI.

## Per-video execution

Required files: approved script, matching voiceover, FramePilot CSV, optional QA JSON, visual assets, brief and continuity references.

Suggested request:

> Use `/framepilot-motion-producer`. Build the complete FramePilot-compatible Remotion project in one pass. Follow the supplied production brief and asset numbering. Validate the original CSV, account for every required image, create all scene and timing metadata, run static project checks, and deliver one import-ready ZIP. Do not render or create previews in Claude. FramePilot will render locally.

## Team handoff

Every project ZIP must carry its own README, asset manifest, scene plan and static QA report. Do not rely on undocumented Claude memory or a prior conversation. Use the versioned master instruction and same Skill release for all team members.

## Retry / revision protocol

When a user reports a rendering defect:

1. Ask for the exact FramePilot error/report and relevant output facts, not a vague “it failed.”
2. Identify whether the problem is source, manifest, import contract, runtime, asset path, resource or sandbox-related.
3. Modify only the affected source modules and maintain a decision log.
4. Re-run the same static checks and compare output hashes / manifest changes.
5. Create a revised ZIP with a clear version suffix.
6. Never ask Claude to render a preview to diagnose a problem.
