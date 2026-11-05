# FramePilot Word-Timing CSV Contract — v1.0

## Canonical schema

The only accepted source CSV has this exact UTF-8 header and column order:

```csv
Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms
```

No extra columns. Do not substitute SRT, VTT, Filmora EMS, the 21-column Filmora Final Master CSV, or a self-invented timing format.

| Field | Meaning | Authority |
|---|---|---|
| `Word_Index` | Stable source row identifier, normally 1-based | Preserve exactly |
| `Script_Word` | Token from intended script aligned to this row | Editorial/reference text |
| `Recognized_Word` | Token detected from actual voiceover | Spoken-word evidence |
| `Start_ms` | Start in milliseconds from audio start | Timing authority |
| `End_ms` | End in milliseconds from audio start | Timing authority |

## Immutable input rule

Keep the original CSV unchanged. Copy it to `public/data/word_timing.csv`. A validator report, timing review JSON, or derived frame JSON is a separate file and must never overwrite the original.

## Reading and normalization

- Accept UTF-8 and UTF-8 BOM.
- Use a real CSV parser. Do not split lines or fields manually on commas.
- Preserve Bengali Unicode, combining marks, punctuation, apostrophes, accented text and original row values.
- The exact header is case-sensitive.
- Trim whitespace for validation, but do not rewrite preserved source strings.
- `Word_Index` must be a positive integer and unique. A gap is a warning, not permission to renumber.
- Timestamps must be finite numeric millisecond values. `Start_ms >= 0`; `End_ms > Start_ms`.

## What to do with incomplete rows

| Condition | Required treatment |
|---|---|
| Empty `Recognized_Word` | Do not animate a spoken token; record warning |
| Both times empty | Keep row; mark untimed |
| Only one time empty | Invalid partial interval; record error |
| Negative start / end <= start | Invalid; record error |
| Non-finite value (NaN/Infinity) | Invalid; record error |
| Script/recognized mismatch | Keep both; record mismatch; do not silently correct |
| Overlapping intervals | Preserve and flag; never shift |
| Non-monotonic start | Preserve and flag |
| Empty script token | Do not infer intended script word |

Do not silently remove problematic rows. A project may continue with valid intervals, but its timing-review status must be `PASS_WITH_WARNINGS` or `BLOCKED`, according to the severity and project requirement.

## Frame conversion

Milliseconds remain canonical. Convert at the Remotion boundary using FPS `F`:

- `startFrame = floor(Start_ms * F / 1000)`
- `endFrameExclusive = ceil(End_ms * F / 1000)`
- `durationInFrames = max(1, endFrameExclusive - startFrame)`

The start is inclusive and end is exclusive. Do not round seconds first. Do not accumulate durations by adding rounded word lengths. Compute each word from its absolute millisecond value.

## Word groups and captions

Group words into readable phrases using punctuation, sentence boundaries and narration pauses. The CSV is word-level timing, not a command to render every single token separately. Keep the original word intervals available so a component can highlight a token inside a phrase. Never display a recognition mismatch as if the intended script word was spoken.

Captions are optional. When disabled, still use CSV for scene/event synchronization. Do not create SRT/VTT as a sidecar.

## QA JSON

If FramePilot provides `<name>.QA.json`, preserve and inspect it as a separate sidecar. Record:

- source file and SHA-256,
- total rows and timed valid rows,
- missing recognition and missing times,
- script-recognition mismatches,
- duplicate/gapped indices,
- non-monotonic/overlapping intervals,
- confidence and alignment status, if actually present in source QA,
- warnings and unresolved decisions.

Do not invent a confidence score if the QA file does not provide one. Do not present a Skill-generated report as a FramePilot-generated report.

## Duration truth

Prefer actual audio duration from FramePilot's media metadata / FFprobe report. The maximum valid `End_ms` is only a lower bound when audio duration is unknown. If audio is longer, preserve the tail. Do not stretch the last word to fill silence.

## Supplied tools

- `scripts/validate_word_timing.py` — exact schema, index, timestamp, mismatch and overlap checks.
- `scripts/csv_to_frame_timing.py` — derived absolute frame intervals, never media rendering.

Both use Python standard library only.
