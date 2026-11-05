# FramePilot Remotion Project Contract — v1.0

## Supported baseline

Target the FramePilot Motion runtime currently documented for this project:

- Remotion `4.0.540`
- React `19.1.0`
- React DOM `19.1.0`
- Primary entry: TypeScript/TSX calling `registerRoot`.
- Manifest: `motion-project.json` at the ZIP root.

If the FramePilot runtime manifest changes, treat that as a new compatibility contract. Do not guess versions from a global Node install or update packages independently.

## Required archive layout

```text
FramePilot_Motion_Project_<slug>.zip
├── motion-project.json
├── package.json
├── PROJECT_README.md
├── STATIC_QA_REPORT.md
├── src/
│   ├── index.tsx
│   ├── Root.tsx
│   ├── theme.ts
│   ├── data/
│   ├── components/
│   └── scenes/
├── public/
│   ├── assets/
│   │   ├── audio/
│   │   ├── images/
│   │   ├── video/
│   │   ├── fonts/
│   │   └── sfx/
│   └── data/word_timing.csv
└── project-data/
    ├── source-inventory.json
    ├── editorial-architecture.json
    ├── fact-visualization-register.json
    ├── scene-plan.json
    ├── scene-coverage.csv
    ├── asset-manifest.json
    ├── continuity-register.json
    ├── decision-log.json
    └── timing-review.json
```

Add only folders that have a real purpose. Do not add an outer wrapper folder above the manifest.

## Manifest schema

```json
{
  "schemaVersion": 1,
  "projectName": "Project Name",
  "entryPoint": "src/index.tsx",
  "compositionId": "Main",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationInFrames": 1800,
  "remotionVersion": "4.0.540",
  "voiceover": "public/assets/audio/voiceover.mp3",
  "wordTiming": "public/data/word_timing.csv",
  "inputProps": {},
  "assets": ["public/assets/audio/voiceover.mp3"]
}
```

The fields in this example are illustrative; derive actual values from the supplied project. Optional media keys may be `null` if FramePilot's runtime schema accepts them; otherwise omit them. Do not add undocumented root keys without compatibility verification.

## Cross-check manifest against source

The main `Composition` must match manifest ID, width, height, FPS and duration. `durationInFrames` must include the full verified voiceover duration and the intended visual tail. Never copy example duration blindly.

`src/index.tsx` must import React, `registerRoot`, the root component, and call `registerRoot(Root)`. `src/Root.tsx` must declare the matching Composition.

## package.json

Use exact versions, no `^` or `~`:

```json
{
  "name": "framepilot-motion-project",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "remotion": "4.0.540"
  }
}
```

Add a Remotion package only if a supported feature genuinely requires it and the FramePilot runtime allowlist includes it. Do not put install hooks or scripts in the package.

## Media and path rules

- Put assets under `public/assets/` and reference via `staticFile('assets/...')`.
- CSV stays at `public/data/word_timing.csv`.
- Use local media only. No remote URLs, remote fonts or runtime downloads.
- All archive paths are relative POSIX paths; no drive letter, absolute path, `..`, symlink or path traversal.
- Preserve original source filenames in the asset manifest; safe internal aliases may be used only with an explicit map.
- Do not package `node_modules`, `.git`, `.env`, caches, model weights, browser executables, FFmpeg, user profile paths or credentials.

## Audio placement

Place the main voiceover from frame zero unless the user explicitly requests a different structure. Do not alter original narration speed to hide timing gaps. If the project uses scene-specific audio clips, document source files and exact offsets.

## No render behavior in Claude-generated project

The project source must contain no `renderMedia()` / `renderStill()` call, no Remotion CLI final-render script, no PowerShell/CMD render launcher, no shell process spawn, and no self-updating dependency installation. FramePilot's trusted host invokes its approved renderer after import and security validation.

## Project ZIP validator

Run `scripts/validate_project_zip.py <project.zip> --json-output <report.json>` after packaging. This performs static archive inspection only. It does not execute source and is not a sandbox. FramePilot's Windows OS isolation gate remains authoritative.
