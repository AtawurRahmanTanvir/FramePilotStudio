# Production Intake: [VIDEO TITLE]

> Fill in the bracketed fields and attach the listed files before sending this intake to Claude.
> The Skill inspects all attached files automatically — this document is a production manifest, not a questionnaire.

---

## 1. Source Files Checklist

Attach each file to this Claude session before invoking the Skill. Check each item that has been attached:

- [ ] **Approved script** — TXT, MD, DOCX, PDF, or pasted text. This is the narrative authority; Claude will not invent content beyond it.
- [ ] **FramePilot Word Timing CSV** — must have the exact five-column header (see §2). This is required; production cannot begin without it.
- [ ] **FramePilot QA JSON sidecar** (`.QA.json`) — optional; export from FramePilot's Word Timing session if available.
- [ ] **Visual assets** — all mandatory images, logos, diagrams, illustrations, video clips, fonts, SFX files, maps, and reference images. Include every file the brief calls mandatory; do not pre-filter.
- [ ] **Production bible / style guide** — optional but strongly recommended for series or branded work.
- [ ] **Specific production instructions** — optional; paste or attach supplementary notes, factual caveats, legal constraints, or continuity rules not covered in the bible.

---

## 2. Word Timing CSV Confirmation

Confirm the attached CSV matches the canonical five-column FramePilot schema:

| Column | Type | Description |
|---|---|---|
| `Word_Index` | integer | Sequential index from FramePilot; never renumber |
| `Script_Word` | string | Intended word from the approved script |
| `Recognized_Word` | string | Word actually recognized from the voiceover audio |
| `Start_ms` | integer | Word start time in milliseconds (absolute) |
| `End_ms` | integer | Word end time in milliseconds (absolute) |

**CSV filename (base name used as session hint):** `[e.g. my-documentary-session-01.csv]`

> [!IMPORTANT]
> If the attached CSV does not match this exact header, production will be blocked. Do not substitute SRT, VTT, or any other timing format.

---

## 3. Narration Binding Note — Do NOT Re-Upload the Voiceover

The original voiceover audio is **already stored locally in FramePilot Studio's Word Timing session**. Claude will write a `narration` binding in `motion-project.json` that FramePilot resolves automatically at import time:

```json
"narration": {
  "logicalId": "voiceover.primary",
  "source": "framepilot-linked-audio",
  "required": true,
  "sessionId": "<derived from CSV filename or explicit session ID below>",
  "target": "public/audio/narration.wav"
}
```

**Do not attach the WAV/MP3 voiceover file to this session.** FramePilot will inject the audio locally. If you have an explicit session ID to use instead of the CSV filename, provide it here:

**Session ID (optional override):** `[leave blank to derive from CSV filename]`

---

## 4. Visual Assets Inventory

List every visual asset attached in this session. Claude will verify this against the asset manifest it builds. If this list differs from what was attached, the decision log will record the discrepancy.

| # | Filename | Type | Role / Purpose | Mandatory? |
|---|---|---|---|---|
| 1 | `[filename.jpg]` | Image | `[e.g. Opening establishing shot]` | Yes / No |
| 2 | `[filename.png]` | Logo | `[e.g. Brand logo — lower-third]` | Yes / No |
| 3 | `[filename.ttf]` | Font | `[e.g. Primary display font]` | Yes / No |
| … | … | … | … | … |

> Total asset count attached: **[n]**
> All assets with original filenames and serial numbers preserved: **Yes / No**

---

## 5. Production Brief

Complete all fields. Claude uses these settings as the primary authority for production decisions.

| Setting | Value |
|---|---|
| **Project name / slug** | `[e.g. acme-history-ep01]` |
| **Target resolution** | `[default: 1920×1080]` |
| **Target FPS** | `[default: 30]` |
| **Aspect ratio** | `[default: 16:9]` |
| **Language(s)** | `[e.g. English / Bengali / bilingual]` |
| **Caption policy** | `[none / phrase-emphasis / word-emphasis / full karaoke]` |
| **Audio policy** | `[default: no background music; SFX from procedural generator only]` |
| **SFX families needed** | `[e.g. whoosh, impact, ambient — or "none"]` |
| **Camera style** | `[locked / controlled pan / scene-specific]` |
| **Asset usage rule** | `[use all supplied / use selected — list exceptions]` |
| **Style authority** | `[attached bible / inline instructions / Skill defaults]` |
| **Special constraints** | `[historical accuracy, legal caveats, brand rules, language constraints, continuity locks, naming requirements]` |
| **Known factual sources** | `[list approved data sources, figures, or approved quotations — Claude will not invent beyond these]` |

---

## 6. Invocation

Once all files are attached and this intake is complete, invoke the Skill with:

> **Invoke `/framepilot-motion-producer` to begin production.**

The Skill will execute in one pass:
1. Source audit and inventory
2. Word timing validation and frame conversion
3. Editorial architecture and fact/visual register
4. Scene plan, asset manifest, scene coverage, continuity register, decision log
5. Procedural SFX generation
6. Narration binding
7. Full modular Remotion 4.0.540 source
8. Static QA report
9. Delivery ZIP

**Do not ask Claude to render a preview, produce an MP4, run PowerShell, or install node_modules. FramePilot Studio performs the final render locally via the RENDER VIDEO button.**
