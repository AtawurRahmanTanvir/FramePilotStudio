# Asset Generation & Management Specification

## 1. Local-Only Asset Philosophy

FramePilot Studio projects are completely self-contained. All media files referenced by the Remotion composition must reside inside the project directory structure under `public/`:

```
public/
├── audio/
│   └── narration.wav          # Resolved locally during FramePilot import
├── sfx/
│   ├── SFX_MANIFEST.json      # Metadata for all generated effects
│   ├── whoosh_42.wav
│   ├── impact_42.wav
│   └── click_42.wav
├── images/
│   ├── archive_doc_01.webp
│   └── portrait_hero.jpg
└── data/
    └── word_timing.csv        # Canonical 5-column timing data
```

---

## 2. Asset Manifest (`project-data/asset-manifest.json`)

Every project must maintain an exhaustive asset manifest detailing each asset, its purpose, format, and source origin:

```json
{
  "schemaVersion": "1.0",
  "totalAssets": 6,
  "assets": [
    {
      "id": "asset-narration",
      "path": "public/audio/narration.wav",
      "type": "audio/wav",
      "origin": "framepilot-linked-audio",
      "role": "primary-voiceover",
      "durationMs": 60000
    },
    {
      "id": "sfx-whoosh-01",
      "path": "public/sfx/whoosh_42.wav",
      "type": "audio/wav",
      "origin": "procedural-sfx-generator",
      "role": "transition-accent",
      "durationMs": 650
    },
    {
      "id": "timing-csv",
      "path": "public/data/word_timing.csv",
      "type": "text/csv",
      "origin": "framepilot-word-timing",
      "role": "editorial-alignment",
      "rows": 342
    }
  ]
}
```

---

## 3. Formatting & Sizing Guardrails

- **Image Formats**: WEBP or JPG for photographic archival assets. PNG or SVG for logos, seals, and transparent iconography.
- **Maximum Resolution**: 1920 × 1080 for fullscreen images; 2560 × 1440 for assets subject to camera push/parallax maneuvers.
- **File Size Ceiling**: Individual images should not exceed 4 MB. Total project uncompressed payload must stay comfortably within the 3 GB safety limit.
- **Forbidden File Types**: Never include `.exe`, `.dll`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.msi`, `.scr`, `.zip`, `.tar`, or node runtime binaries in project asset folders.

