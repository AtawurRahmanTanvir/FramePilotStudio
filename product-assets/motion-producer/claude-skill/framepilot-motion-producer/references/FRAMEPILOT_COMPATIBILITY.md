# FramePilot Compatibility & Security Boundary Specification

## 1. FramePilot Studio Ecosystem Contract

FramePilot Studio provides an offline-capable, local-first production environment. Motion Studio is completely independent from Filmora Studio:

| Dimension | Filmora Studio | Motion Studio |
|---|---|---|
| **Primary Output** | Wondershare Filmora `.wfp` project | Direct MP4 render via local Remotion runtime |
| **Data Schema** | 21-column Final Master CSV | Canonical 5-column Word Timing CSV |
| **Pacing Model** | Image allocation per sentence/concept | Word-by-word forced alignment & kinetic frame sync |
| **Asset Linking** | Image folder scanning | Local session narration binding + procedural SFX |
| **Rendering** | External Filmora application | Bundled Chromium Headless Shell + native compositor |

---

## 2. Windows Worker Isolation & Security Architecture

1. **Static Inspection Before Extraction**:
   - The project ZIP is validated using Python's `zipfile` module before extraction.
   - Entry names are sanitized against path traversal (`..`), absolute drive letters (`C:`), and alternate data streams (`:`).
   - Executable binaries, scripts, or batch files are strictly prohibited.
2. **Untrusted Code Containment**:
   - Remotion projects contain executable JavaScript/TypeScript.
   - The local rendering worker executes inside an isolated Node.js child process where network access is denied and filesystem access is confined strictly to the project directory and designated render output folder.
3. **No Dynamic Remote Dependencies**:
   - The project must not rely on `npm install` during import or render.
   - All required libraries are pre-installed in FramePilot's offline runtime.
   - No runtime CDN fetches or telemetry beacons are permitted.

---

## 3. Supported Remotion Runtime Environment

- **Node.js**: Bundled private Node.js (Windows x64).
- **Headless Browser**: Chromium Headless Shell (`chrome-headless-shell.exe`).
- **Compositor**: `@remotion/compositor-win32-x64-msvc` v4.0.540.
- **Video Encoder**: Local FFmpeg & FFprobe (bundled under `runtime/ffmpeg/`).
- **Render Output**: H.264 / AAC MP4, standard $1920 \times 1080$, 30fps.

