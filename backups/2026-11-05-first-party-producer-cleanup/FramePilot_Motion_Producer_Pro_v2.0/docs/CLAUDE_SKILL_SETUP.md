# Claude Skill and Project Setup

## Option A — Claude.ai / Claude Desktop custom Skill

1. Extract the outer `FramePilot_Motion_Producer_Pro_v2.0_FINAL.zip`.
2. Locate `Claude_Skill_Upload.zip` in the extracted root.
3. In Claude, open **Customize → Skills**.
4. Choose **Create skill → Upload a skill** and upload that ZIP.
5. Enable the Skill.
6. Add `claude-project/PROJECT_INSTRUCTIONS.md` to the Claude Project's persistent Instructions once.
7. Keep the Skill enabled for each production session.

Custom Skill availability depends on Claude product/plan and code execution settings. The current Help Center lists the upload path and notes that custom skills are private unless separately shared. Check the current UI if menu names move.

## Option B — Claude Code

Copy the extracted folder:

`claude-skill/framepilot-motion-producer/`

to one of:

- Personal: `~/.claude/skills/framepilot-motion-producer/`
- Project: `<repo>/.claude/skills/framepilot-motion-producer/`

The directory must contain `SKILL.md` directly. The command is:

`/framepilot-motion-producer`

Restart or refresh the Claude Code session if the skill directory did not exist when the session started.

## One-time project instruction

Open `claude-project/PROJECT_INSTRUCTIONS.md` and add its complete contents to the Claude Project Instructions once. Do not re-upload this instruction for every video.

## Every video

Use `claude-project/PER_VIDEO_INTAKE.md` as a checklist. Attach that video's script, voiceover, CSV, QA JSON, assets and brief. Then invoke the Skill.

## Team sharing

On Claude.ai, do not assume a personal uploaded Skill is automatically visible to team members. Share/provision it using the organization controls if supported, or have each teammate upload the same versioned file. With Claude Code, a project-level `.claude/skills/` folder can be kept in the repo after review.

## Version updates

Use `metadata/VERSION.json` and `docs/CHANGELOG.md`. Replace/update the skill as one versioned package; do not mix reference docs from different versions.
