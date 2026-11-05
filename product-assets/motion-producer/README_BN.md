# FramePilot Motion Producer Pro v2.0

**নিজস্ব Motion Production Skill + Claude Project Kit + FramePilot handoff contract**

এই প্যাকেজের কাজ হলো Claude-কে একটি নির্দিষ্ট production discipline শেখানো: Script, Voiceover, FramePilot Word-Timing CSV এবং supplied visual assets বিশ্লেষণ করে FramePilot Studio-তে import করার উপযোগী Remotion project তৈরি করা। Final MP4 অবশ্যই ব্যবহারকারীর নিজস্ব PC-তে FramePilot Studio-এর **RENDER VIDEO** বাটন দিয়ে হবে।

## এক কথায় দায়িত্ব ভাগ

`FramePilot Word Timing → CSV + QA JSON → Claude Skill → Remotion Project ZIP → FramePilot Import → RENDER VIDEO → Final MP4`

- Claude: পরিকল্পনা, visual direction, scene/asset mapping, source code, static QA, project ZIP।
- FramePilot: word alignment, project import/security gate, bundled Remotion execution, final MP4, FFprobe verification।
- User/team: approved script, voiceover, assets, creative brief, final review।

## প্যাকেজে কী আছে

| অংশ | উদ্দেশ্য |
|---|---|
| `claude-skill/framepilot-motion-producer/` | পূর্ণাঙ্গ নিজস্ব Skill, references, schemas, scripts ও templates |
| `claude-project/PROJECT_INSTRUCTIONS.md` | Claude Project-এ একবারের জন্য Master Instructions |
| `claude-project/PER_VIDEO_INTAKE.md` | প্রতি ভিডিওতে upload/request checklist |
| `docs/` | production bible, team workflow, install guide, app integration ও release standards |
| `claude-skill/.../templates/patterns/` | 12 reusable motion component source templates |
| `examples/sample-remotion-project/` | modular, self-contained Remotion starter source |
| `tools/` | CSV validation, frame conversion, project ZIP validation ও packaging tools |
| `tests/` | deterministic Python unit tests |
| `metadata/` | version, file manifest ও SHA-256 inventory |

## একবারের সেটআপ

1. ZIP extract করো।
2. Claude.ai ব্যবহার করলে `Claude_Skill_Upload.zip`-টি Customize → Skills → Create skill → Upload a skill থেকে upload ও enable করো। এই skill file-টি outer ZIP-এর ভেতরে রাখা আছে।
3. `claude-project/PROJECT_INSTRUCTIONS.md` একবার Claude Project Instructions-এ যোগ করো।
4. Claude Code ব্যবহার করলে `claude-skill/framepilot-motion-producer/` folder-টি `.claude/skills/` অথবা `~/.claude/skills/`-এ রাখো। Slash command হবে `/framepilot-motion-producer`।
5. team member-দের একই Skill release এবং Master Instructions দাও।

Claude UI-এর menu label/version ভিন্ন হতে পারে। Official Skills upload workflow-এর নিয়ম অনুসারে Skill folder-এর নাম Skill `name`-এর সঙ্গে মেলাতে হবে এবং ZIP-এর ভিতরে ওই folder-টি থাকতে হবে।

## প্রতিটি ভিডিওতে কী upload করবে

- Approved script.
- Matching voiceover.
- FramePilot five-column CSV.
- Matching `.QA.json`, থাকলে।
- সমস্ত mandatory image/video/audio assets.
- Master visual reference / camera lock / style guide.
- Project-specific creative brief.

তারপর Claude-কে বলবে: `Use /framepilot-motion-producer and produce the complete FramePilot project ZIP in one pass.`

## CSV — canonical contract

```csv
Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms
```

SRT/VTT নয়। Filmora-এর ২১-column Final Master CSV নয়। Motion-এর পাঁচ-column CSV আলাদা। Source rows/timestamps পরিবর্তন করা যাবে না।

## স্থানীয় QA tools

Python 3.10+ recommended; no third-party Python packages required.

```bash
python tools/validate_word_timing.py path/to/word_timing.csv --json-output timing-report.json
python tools/csv_to_frame_timing.py path/to/word_timing.csv --fps 30 --output word_timing.frames.json
python tools/validate_project_zip.py path/to/FramePilot_Motion_Project.zip --json-output project-report.json
python -m unittest discover -s tests -v
```

Toolগুলো static data/package validation করে। এগুলো Remotion project execute করে না, MP4 render করে না, এবং Windows sandbox নিরাপদ—এমন প্রমাণ দেয় না।

## গুরুত্বপূর্ণ সীমা

- Claude কোনো MP4 preview/final render করবে না।
- Claude কোনো SRT/VTT তৈরি করবে না।
- Project ZIP import হওয়ার পর FramePilot-এর নিজস্ব Windows security gate-ই execute permission দেবে বা block করবে। Static ZIP validator সেই gate-এর বিকল্প নয়।
- Remotion project code-এর static QA pass মানে visual QA pass নয়। Final MP4 FramePilot-এ render হওয়ার পর human review প্রয়োজন।
- Bengali text shaping/voice alignment-এর readiness বাস্তব model/font/runtime test ছাড়া certified নয়।
- YouTube reference video `42fYir1OeMQ` এই build environment থেকে fetch করা যায়নি; প্যাকেজটি GitHub repository, supplied upstream ZIP, supplied FramePilot overlay ZIP এবং বিদ্যমান CSV/project contract-এর ভিত্তিতে তৈরি। ভিডিওর অদেখা ধাপকে verified বলা হয়নি।

## Core files

- Skill: `claude-skill/framepilot-motion-producer/SKILL.md`
- Master Project Instructions: `claude-project/PROJECT_INSTRUCTIONS.md`
- Per-video intake: `claude-project/PER_VIDEO_INTAKE.md`
- Copilot integration: `docs/COPILOT_FRAMEPILOT_INTEGRATION.md`
- Project contract: `claude-skill/framepilot-motion-producer/references/FRAMEPILOT_PROJECT_CONTRACT.md`
- CSV contract: `claude-skill/framepilot-motion-producer/references/WORD_TIMING_CSV_CONTRACT.md`

## Version

`2.0.0` — initial expanded Pro package. See `docs/CHANGELOG.md`.
