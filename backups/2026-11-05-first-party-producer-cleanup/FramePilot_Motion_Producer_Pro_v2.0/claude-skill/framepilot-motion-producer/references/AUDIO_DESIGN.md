# Voiceover, Music and Sound-Effects Standard

## Voiceover preservation

The supplied voiceover is the timing and performance anchor. Preserve the source file unchanged. Do not time-stretch or pitch-shift narration to fit an arbitrary scene grid. If the composition needs a tail, use verified audio duration rather than stretching the last word.

## Default audio policy

- No background music unless the user explicitly asks for it.
- Natural-sound-only or no-music rules always override generic creative defaults.
- SFX are optional and should be sparse.
- Do not synthesize audio assets when the user forbids it.

## Sound event specification

Every sound event should have:

- `eventId`
- `sourceFile` (local path) or `generatedSource` with explicit permission
- `sceneId`
- `atMs` or source-grounded timing
- `durationMs` if known
- `purpose` (transition, object interaction, emphasis, environment)
- `mixPriority`
- `notes`

Never attach a whoosh to every entrance. Use sound only when the visual event merits an audible accent.

## Mix discipline

- Voiceover stays intelligible and dominant.
- Avoid clipping and abrupt gain jumps.
- Do not stack SFX over important words unless the user requests it.
- Keep silence when silence is part of the pacing.
- If actual loudness measurement is not available, do not claim LUFS or peak compliance.

## Offline media

Use local files only. No remote audio streaming, runtime downloads or hidden requests. Record source filenames and license/permission notes in the asset manifest.
