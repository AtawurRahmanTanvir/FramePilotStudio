# Narration Asset Binding — Local-First Audio Link Specification

## Core Principle

**Claude must NEVER ask the user to upload the voiceover audio again.**

The user has already provided the voiceover audio to FramePilot Studio during the Word Timing generation stage. The voiceover is preserved locally on the user's workstation in verified session storage.

When Claude generates a Remotion project, it generates a declarative **logical narration binding** in `motion-project.json`. FramePilot Studio automatically resolves this binding during the project import process, copying or staging the local narration file directly into the imported project's `public/audio/narration.wav`.

---

## 1. Declarative Manifest Schema

In `motion-project.json`, declare the logical narration reference using either `voiceoverBinding` (canonical) or `narration`:

```json
{
  "schemaVersion": 1,
  "projectName": "Documentary Title",
  "entryPoint": "src/index.tsx",
  "compositionId": "Main",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationInFrames": 1800,
  "remotionVersion": "4.0.540",
  "voiceover": null,
  "voiceoverBinding": {
    "logicalId": "voiceover.primary",
    "source": "framepilot-linked-audio",
    "required": true,
    "sessionId": "wt-1730793600-a1b2c3d4",
    "originalFilename": "voiceover_chapter_01.wav",
    "target": "public/audio/narration.wav"
  },
  "wordTiming": "public/data/word_timing.csv",
  "inputProps": {},
  "assets": [
    "public/data/word_timing.csv"
  ]
}
```

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `logicalId` | `"voiceover.primary"` | Fixed logical identifier for primary narration |
| `source` | `"framepilot-linked-audio"` | Signals FramePilot to resolve from local Word Timing session |
| `required` | `true` | Indicates project requires narration for audio sync |
| `sessionId` | `string` (optional) | Matches `.session.json` or `.QA.json` session ID |
| `originalFilename` | `string` (optional) | Original voiceover filename for secondary heuristic match |
| `target` | `string` | Relative path inside the project where audio will be staged (must be project-relative, e.g. `public/audio/narration.wav`) |

---

## 2. Remotion Source Code Pattern

In your Remotion React code, reference the narration audio via Remotion's `staticFile()` API pointing to the target path:

```tsx
import { Audio, staticFile, useVideoConfig } from 'remotion';

export const MainAudio: React.FC = () => {
  return (
    <Audio
      src={staticFile('audio/narration.wav')}
      startFrom={0}
      volume={1.0}
    />
  );
};
```

### Temporal Pacing Rule
- Always start the narration audio at frame 0 unless the creative brief specifies a dedicated silent cold-open card.
- If a cold-open card is used (e.g., 60 frames), offset the audio using `<Sequence from={60}>`.
- Never stretch, loop, or pitch-shift narration audio in Remotion. The spoken word cadence determines the master timeline.

---

## 3. FramePilot Import Resolution Behavior

When FramePilot Studio imports a Claude-generated project ZIP:

1. **Static Validation Gate**: Inspects the ZIP archive without executing any code. Verifies that `target` is a valid project-relative path without traversal (`..`) or absolute drive references.
2. **Session Identification**:
   - Reads `voiceoverBinding.sessionId` from the manifest.
   - Searches `Documents/FramePilot Studio/Motion Projects/Word Timing/` for matching `.session.json`.
3. **Audio File Retrieval**:
   - Reads `sourceAudioPath` from the verified session record.
   - Verifies that the source audio file exists on disk, has non-zero size, and is an approved audio format (`.wav`, `.mp3`, `.m4a`, `.flac`, `.aac`, `.ogg`, `.opus`).
4. **Staging**:
   - Copies the local source audio directly to `<imported_project>/public/audio/narration.wav`.
   - Preserves original metadata, sample rate, and bit depth.
5. **Fallback & Graceful Degradation**:
   - If the audio already exists in the ZIP archive (user manually included it), FramePilot uses the archived file and issues an informational note.
   - If session matching cannot locate the original file (e.g. file was moved), FramePilot completes the import and displays an advisory warning:
     > *"Narration audio could not be automatically resolved from local Word Timing sessions. You can place the audio into public/audio/ manually before rendering."*
   - Import does **not** fail; the user remains in control.

---

## 4. Privacy and Security Guardrails

- **Zero Cloud Upload**: The voiceover audio file is never uploaded to Claude or any external API.
- **Fail-Closed Security**: Project import extracts files to an isolated directory and verifies that no symbolic links or path escapes occur.
- **Source Integrity**: The original voiceover file in the Word Timing directory is opened in read-only mode and is never modified or deleted.

---

## 5. Anti-Patterns to Avoid

> ⛔ **Anti-pattern: Asking the user to re-upload audio**
> Never say: "Please upload your voiceover audio file." The audio is already in FramePilot. Always emit `voiceoverBinding` with `"source": "framepilot-linked-audio"`.

> ⛔ **Anti-pattern: Using absolute paths in manifest**
> Never set `target: "C:\\Users\\...\\audio.wav"` or `target: "/audio.wav"`. Always use project-relative POSIX paths like `public/audio/narration.wav`.

> ⛔ **Anti-pattern: Hardcoding remote audio URLs**
> Never set `src="https://..."` in Remotion `<Audio>`. Remote network fetching is strictly blocked in FramePilot's sandboxed runtime.

