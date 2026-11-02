# FramePilot Studio — Architecture Notes (0.1.4)

## Target runtime

```text
FramePilot Studio Desktop
  ├─ Electron Renderer (HTML/CSS/JS, sandboxed)
  │    ├─ User logo + original animated local SVG illustration
  │    ├─ File state / engine telemetry / live progress
  │    ├─ Audio-to-CSV workspace
  │    ├─ WFP Timeline workspace
  │    └─ Settings / official update & version manager
  ├─ Preload (allow-listed IPC only)
  └─ Electron Main
       ├─ local framepilot:// protocol
       ├─ native file/folder dialogs
       ├─ persistent user preferences
       ├─ deterministic output-path manager
       ├─ Python engine process lifecycle + structured error propagation
       └─ official website update client / verified installer staging
            └─ Private Python Runtime (target release)
                 ├─ FFmpeg + FFprobe
                 ├─ WhisperX ASR + per-language alignment models
                 ├─ mapping phrase alignment
                 ├─ Final Master CSV + QA
                 ├─ Filmora WFP project engine
                 └─ motion/effects engine
```

## Pipeline A — Audio to CSV

1. Validate selected audio and Visual Mapping CSV.
2. FFprobe validates the audio stream; bundled FFmpeg normalizes to mono 16 kHz PCM WAV and reports conversion progress.
3. WhisperX local ASR runs with `local_files_only=True`; its progress callback drives the UI's real percent value.
4. The detected language's local forced-alignment model loads with `model_cache_only=True`; its progress callback drives word alignment progress.
5. The deterministic matcher aligns each `Exact_Voiceover_Span` against ordered word segments. It does not create synthetic timestamps; missing/ambiguous phrases must fail or be review-flagged.
6. Write the exact 21-column Final Master CSV and companion QA report into the user-configured default CSV directory.
7. QA checks schema/order, row count, image sequence, monotonically increasing markers, 25 FPS collisions, and final hold integrity.

## Pipeline B — Timeline

1. Inputs: source Filmora WFP, Final Master CSV, optional Image Folder.
2. Inspect source archive, CSV, image clips, native markers and timeline metadata.
3. Apply verified timing and existing motion templates.
4. Save the new WFP beside the source project. Example: `BrandFilm_FramePilotStudio_Enhanced_v0.1.4.wfp`; unique numeric suffix is used when needed.
5. Never overwrite the selected source WFP.
6. WFP progress includes the analysis phase and export phase. Final structural QA does not replace opening and playing the output in Filmora 15.

## Output preferences

- CSV default: `%USERPROFILE%/Documents/FramePilot Studio/CSV`, stored in per-user Electron `userData/settings.json`. User can change this directory once.
- WFP output: same directory as its input project, using `<SourceName>_FramePilotStudio_Enhanced_v<version>.wfp`.
- Each output path is checked for existing files; numeric suffix prevents accidental overwrite.

## Official update policy

The application reads update metadata only from the user-designated website:
- `https://framepilotstudio.github.io/updates/manifest.json`
- `https://framepilotstudio.github.io/updates/versions.json`

The website's release catalogue is the only source for latest and historic versions. Installer files may be GitHub Release assets, but they are discovered through the website JSON. HTTPS host allow-list, mandatory SHA-256 validation and user-approved installation are enforced in the update client. `Check All Versions` loads the complete catalogue and supports switching/downgrading to any listed release. A public version cannot be switched to until the website publishes a matching installer URL and checksum.

## Runtime bundling and release gates

- Bundle an app-private Python runtime or a frozen Python backend; never rely on a user's Python PATH in production.
- Bundle the exact FFmpeg/FFprobe binaries required, with audited licensing.
- Bundle WhisperX, compatible PyTorch/torchaudio/CTranslate2/faster-whisper packages and every shipped ASR/aligner model. `local_files_only` / `model_cache_only` must prevent first-run network downloads.
- Complete a clean Windows 10/11 test with no external Python, FFmpeg, WhisperX or models installed.
- Test app startup, file picker states, Audio ASR + word alignment, CSV QA, WFP analysis/export, opening output in Filmora 15, update, downgrade and failed-update rollback.
- Complete dependency and model licenses, code-sign installer and verify the signature before first public release.


## UI boundary (0.1.4)
The Electron renderer is the only user interface. The old Tkinter presentation layer has been removed from the WFP processing module. WhisperX and FFmpeg are implementation dependencies, not separate user-facing applications or menu destinations.


## UI information architecture (0.1.4)
- Primary workspace navigation includes Overview, Audio to CSV, Script-to-Image Mapping and Timeline Engine.
- Activity & QA, Settings, and Help & Guide form the support/system group.
- Script Mapping copies the original master prompt and opens ChatGPT; users must attach the selected script themselves and choose a suitable Thinking reasoning level.
- Reference-only Motion Library page, repeated footer labels, slogans, breadcrumbs and duplicate runtime panels are intentionally omitted from primary screens.
- Static instructions and limitations are consolidated in Help & Guide; only actionable inputs, controls, outputs and readiness states remain in the workspaces.
