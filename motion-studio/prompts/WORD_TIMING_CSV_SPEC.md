# Motion Studio Word Timing CSV Specification

Motion Studio uses its own CSV. It is not the Filmora/EMS Final Master CSV and must never be submitted to the Filmora Timeline Engine.

## Core columns

| Column | Meaning |
|---|---|
| `Word_Index` | Sequential row identifier |
| `Script_Word` | Expected word from the approved script; blank for an extra recognized word |
| `Recognized_Word` | Word actually recognized/aligned from the voiceover; blank for a script word not found in the audio |
| `Start_ms` | Word start time in milliseconds; blank when no valid alignment exists |
| `End_ms` | Word end time in milliseconds; blank when no valid alignment exists |

## Alignment behavior
- Transcribe the actual audio first.
- Use a supported local forced aligner for the detected language.
- Compare script tokens with recognized tokens in sequence.
- Preserve extra audio words and missing script words as reviewable rows.
- Never assign synthetic timestamps to missing or unalignable words.
- Preserve millisecond precision in CSV; convert to composition frames only during Remotion rendering.

## Companion QA report
The CSV stays compact. A companion `.QA.json` should record detected language, model identifiers, audio duration, total script words, total recognized words, matched words, missing script words, extra recognized words, low-confidence words, timestamp collisions and warnings. This report is the place for confidence and detailed diagnostics, not extra CSV columns.
