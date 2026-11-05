# Motion Studio — Claude Project Kit UI Specification

## Page purpose

This page is a setup-and-handoff utility, not a video editor. It should make the one-time Skill/Project setup easy and provide reusable per-video handoff actions.

## Recommended layout

### Persistent project setup

- Status line: `Skill setup: Ready / Not configured`.
- `COPY MASTER INSTRUCTIONS` button.
- `SAVE MASTER INSTRUCTIONS` button.
- `SAVE PRODUCER SKILL` button.
- Compact help text: upload/enable once; add Master Instructions once.

### Claude Project shortcut

- Label: `Claude Project URL`.
- Single-line URL field.
- `SAVE PROJECT LINK` button.
- `OPEN CLAUDE PROJECT` button.
- If no project URL is configured, opening falls back to `https://claude.ai/` and asks the user to save the private Project URL once.

### Per-video handoff

- `COPY PER-VIDEO HANDOFF` button.
- Short checklist: Script + Voiceover + FramePilot CSV + QA JSON (if available) + visual assets + brief.
- Note: Word Timing generates the CSV inside FramePilot. The user should not manually create SRT/VTT.

## Behavior contract

| Action | Expected behavior |
|---|---|
| Copy Master Instructions | Copy exact UTF-8 text to clipboard; toast on success/failure |
| Save Master Instructions | Open native save dialog; write exact packaged bytes; handle cancel without error |
| Save Producer Skill | Save exact packaged Skill ZIP bytes; don't rebuild or mutate them at runtime |
| Save Project Link | Validate URL, then store in per-user app settings |
| Open Claude Project | Open configured URL via safe external navigation; no file transfer |
| Copy Per-Video Handoff | Copy exact reusable request to clipboard |

## URL validation

- Scheme must be HTTPS.
- Hostname must be exactly `claude.ai` or `www.claude.ai`.
- No username/password credentials.
- No other protocol or hostname.
- Do not log query strings or personal URL path unnecessarily.

## Privacy

No script, voiceover, CSV, audio, image or project ZIP is sent to Claude by these buttons. They only copy/save text, save the Skill ZIP, persist the user-selected project URL, and open a browser page. The user controls all uploads.

## Visual restraint

Use existing Motion Studio styles. Do not add a timeline, video player, live preview, editing surface, render settings panel or redundant dashboard to this page. Final rendering remains in the single Render Video page.
