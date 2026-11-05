# FramePilot Motion Project Contract — Schema Version 1

A Claude-generated project ZIP must contain `motion-project.json` at the ZIP root.

## Required manifest example

```json
{
  "schemaVersion": 1,
  "projectName": "Example Motion Project",
  "entryPoint": "src/index.ts",
  "compositionId": "Main",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationInFrames": 1800,
  "remotionVersion": "4.0.540",
  "voiceover": "public/voiceover.mp3",
  "wordTiming": "data/word-timing.csv",
  "inputProps": {},
  "assets": ["public/voiceover.mp3", "public/sfx/whoosh.wav"]
}
```

## Required project files
- `motion-project.json`
- `package.json`
- Manifest entry point (normally `src/index.ts`)
- Composition source (normally `src/Root.tsx`)
- All local fonts, images, audio, logos and SFX referenced by code or manifest
- Optional unchanged source word timing CSV under `data/`

## Supported import rules
- ZIP paths must be relative and remain within the selected project destination.
- Reject traversal paths, absolute paths, symbolic links, duplicate normalized paths, oversized archives and unsafe file types.
- Do not execute imported JavaScript during inspection/extraction.
- Do not install packages from the imported project's package.json.
- Reject ZIPs containing `node_modules`, `.git`, virtual environments, executable installers, scripts or binary executables.
- Dependencies must be an exact-version subset of the FramePilot runtime allowlist: `react@19.1.0`, `react-dom@19.1.0`, `remotion@4.0.540`, and approved `@remotion/*` packages pinned to `4.0.540`. The initial runtime allowlist includes `@remotion/player`, `@remotion/transitions`, `@remotion/motion-blur`, and `@remotion/captions`.
- The first runtime profile supports the Remotion packages and version declared by the installed Motion runtime. Projects requiring other packages must be reviewed and built into an approved runtime profile.
- Missing or unlisted assets must be reported before preview or render.
- Relative imports from TypeScript/JavaScript source files must resolve to files
  inside the ZIP. Package imports are still limited to the exact runtime
  allowlist; missing local imports are rejected during static inspection.

## Current implementation boundary
The overlay's importer validates and extracts the project safely and records the manifest. The final Remotion render worker must still be connected and validated against the user's downloaded upstream Skill source, exact Runtime bundle and real example project before production use.
