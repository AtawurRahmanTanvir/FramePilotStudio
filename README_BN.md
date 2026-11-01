# FramePilot Studio — Development Build 0.1.3

**Purpose:** Local-first Windows desktop workflow for WhisperX-powered Audio-to-CSV generation and Filmora WFP timeline automation.

## 0.1.3 — Task-focused interface
- Unnecessary slogans, repeated brand labels, breadcrumbs, decorative status cards and footer copy removed from the working screens.
- Motion Library reference-only page removed from primary navigation; effect explanations and advanced-option guidance moved to Help & Guide. Actual motion controls remain in Timeline Engine, with less-used controls collapsed under Advanced options.
- Added a Help & Guide section for workflows, output rules, current Filmora limitations and troubleshooting.
- Removed the duplicate logo card from Settings; the supplied logo remains the sole product logo in the sidebar.
- Audio and Timeline screens now use one main work column with larger, direct labels and fewer non-actionable notes. Timeline analysis stays disabled until the required WFP and CSV files are selected; changing an input invalidates the previous analysis.
- Dashboard now presents only the two real workflows, their readiness states and recent activity.
- Real engine errors are propagated to the UI with the Python diagnostic, instead of only showing `Engine exited with code 1`.
- Audio and Mapping selections show a selected-state badge, filename, type and file size; processing requires both files.
- The Audio engine button is disabled until WhisperX, an offline model pack and FFmpeg/FFprobe are available.
- Live progress is driven by FFmpeg, WhisperX transcription, WhisperX word-alignment, and Filmora processing callbacks. A spinning animation is not treated as measured progress.
- CSV output is automatically saved under `Documents/FramePilot Studio/CSV`; change this default once in Settings.
- WFP output is automatically saved beside its source WFP, using a unique suffix such as `ProjectName_FramePilotStudio_Enhanced_v0.1.3.wfp`. The source WFP is never overwritten.
- Settings now includes a website-based update center, latest-version check, full release history and verified version switching/rollback.
- তোমার দেওয়া FramePilot Studio PNG-টাই একমাত্র application brand logo; hero-এর SVG আলাদা production-workflow illustration, অন্য কোনো logo নয়।

## UI / design system
- Near-black graphite surfaces; controlled champagne-gold primary accent and deep-ruby secondary accent.
- User-supplied full logo used unchanged in the app identity, About/Settings area and Windows icon source.
- Hand-authored local SVG illustration and line icons; no external icon CDN, remote fonts or third-party logo artwork.
- SVG uses local gradients, paths and SMIL animation; static counterpart and Reduce Motion switch included.
- Desktop-first layout with responsive collapse for smaller windows.

## Technology
- Electron main process + HTML/CSS/vanilla JavaScript renderer.
- Python backend for ASR, deterministic mapping alignment, CSV QA and existing WFP processing.
- WhisperX and FFmpeg are application-private engines in the target release. They are not included in this development source archive yet.
- Renderer has no Node integration; `contextIsolation` and sandbox are enabled; all file/process actions are allow-listed through preload IPC.

## Run in development
1. On a developer/build machine only, install Node.js LTS and Python 3.10+.
2. Run `npm install`.
3. Run `npm start` or `tools\\START_FRAMEPILOT_DEV.bat`.

Development launcher developer-এর Python environment ব্যবহার করতে পারে; কিন্তু **public installer-এ Python, WhisperX, FFmpeg, FFprobe এবং প্রয়োজনীয় model files private bundle হিসেবে থাকতে হবে**। Production runtime packaging is blocked until all required native dependencies and models are bundled and tested.

## Current capabilities in source
- Electron shell with secure local `framepilot://app/` protocol.
- File pickers display explicit selected state, name, format and size.
- Audio Engine source: FFmpeg/FFprobe inspect and normalize source audio to 16 kHz mono WAV; WhisperX local ASR; local word-level aligner; sequential mapping matcher; 21-column Final Master CSV + QA.
- FFmpeg conversion progress and WhisperX transcription/alignment callbacks feed the live progress UI.
- CSV destination uses a persisted default folder; generated outputs do not require a Save As dialog each time.
- WFP processing preserves the supplied Filmora Automation Studio v0.2.0 engine; output is created beside the input WFP with a versioned unique suffix.
- Timeline progress and export progress are displayed in their own workspace.
- Backend errors are returned with the original exception message and technical traceback.

## Important limitations — do not misrepresent
- This archive does **not** yet contain the Windows WhisperX/PyTorch runtime, FFmpeg/FFprobe binaries, or offline ASR/alignment model weights. Therefore Audio-to-CSV cannot run on a clean machine from this source archive yet. It will be clearly disabled rather than pretending to run.
- The full offline runtime and Windows installer are not built yet.
- Current inherited WFP engine requires the source Filmora project to already have its image clips on a timeline. Importing hundreds of images into an empty WFP is not yet implemented.
- WFP processing has not yet been regression-tested against a real Filmora 15 installation in this environment.
- A clean Windows 10/11 install test, audio regression, Filmora open/playback test, code-signing review and third-party license audit remain release gates.

## Default output policy
- CSV: `%USERPROFILE%\\Documents\\FramePilot Studio\\CSV` by default. User can change it once in Settings. Each output is named from the Visual Mapping CSV with `_FinalMaster`; if a name exists, a numeric suffix is added.
- WFP: same directory as the source `.wfp`. Name pattern: `<SourceName>_FramePilotStudio_Enhanced_v<app-version>.wfp`; if it already exists, a numeric suffix is added. The source file is preserved.
- Output folder preferences are stored in Electron's per-user `userData` settings file, separate from source media.

## Official website and update system
- Only official catalogue source: `https://framepilotstudio.github.io/updates/manifest.json` and `/updates/versions.json`.
- Product/download page: `https://framepilotstudio.github.io/download/`.
- Startup can check the website and automatically download a newer stable release when enabled; installation always waits for user approval.
- `Check for Updates` checks the latest release. `Check All Versions` lists the full published catalogue. Selecting an older release downloads its installer, verifies SHA-256 and Windows Authenticode publisher thumbprint, then allows a version switch/rollback after user approval.
- The website's JSON templates and publishing steps are in `website/` and `website/UPDATER_PUBLISHING_GUIDE_BN.md`.
- The live website's update JSON endpoints and actual release repository are not published/configured yet. The app's update system will remain dormant until those files and signed release installers are published.

## Run tests
```powershell
python -m compileall -q backend tests tools
python -m unittest discover -s tests -p 'test_*.py' -v
node --check src/main/main.js
node --check src/main/update-service.js
node --check src/preload/preload.js
node --check src/renderer/app.js
node --test tests/*.test.js
```

## Release preflight
- `npm run preflight` intentionally blocks distribution while runtime files, model manifests, hashes or license audit are incomplete.
- `npm run dist` runs the guard first and cannot create a partial installer.
- `tools/BUILD_WINDOWS_OFFLINE_RUNTIME.ps1` is the Windows x64 dependency/model staging and PyInstaller build workflow; it requires a developer/build machine with CPython 3.12 and audited FFmpeg binaries, but the final installer contains the private runtime for end users.
- The website catalogue must publish both the installer SHA-256 and the approved Authenticode publisher certificate thumbprint. The app checks both after download and again immediately before launching the installer.
- Before public distribution: validate the PyInstaller backend and all native DLLs on a clean Windows machine; include exact ASR and every supported language aligner model; include trimmed FFmpeg/FFprobe binaries; add file hashes; complete license audit; sign installer with the approved certificate; test update and rollback.

## Legacy engine
`backend/legacy_filmora_engine.py` contains the processing-only portion of the supplied Filmora Automation Studio v0.2.0 code; its Tkinter interface has been removed because FramePilot uses Electron for the UI. Its WFP format assumptions and existing capabilities are documented in `docs/LEGACY_README_BN.txt`. Do not rewrite it until output equivalence is proven.


## 0.1.3 — UI refinement
- Decorative text and repeated labels removed; task controls kept on the main surfaces. Less-used explanations moved to Help & Guide, and secondary motion controls are collapsed under Advanced options.

- Header-এর ডান দিকের update control সরানো হয়েছে; Update Center শুধু Settings-এ।
- মূল dark graphite / gold / ruby design ও navigation অপরিবর্তিত রাখা হয়েছে।
- Default text size বড় করা হয়েছে; Settings থেকে Larger text চালু/বন্ধ ও পছন্দ সংরক্ষণ করা যায়।
- Audio settings থেকে Compute mode ও CPU thread controls সরানো হয়েছে; processing configuration এখন app-managed।
- Sidebar ও Settings-এ supplied square logo-টি proper aspect ratio-তে বড় করে দেখানো হয়।
- File selected state আরও দৃশ্যমান করা হয়েছে।
- Processing library থেকে পুরোনো Tkinter UI code বাদ দেওয়া হয়েছে; WFP processing functions রাখা হয়েছে।
- এই ZIP এখনো Development Source Package; Windows WhisperX/PyTorch/VAD/models এবং FFmpeg runtime এতে bundled নয়।
