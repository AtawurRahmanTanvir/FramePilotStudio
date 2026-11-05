# Reusable Pattern Library

The Skill package includes original starter components under `templates/patterns/`. They are source templates, not a full visual design system and not pre-certified render modules. Copy a component into the project only when it fits the story and verify it against the pinned Remotion runtime.

| Component | Purpose | Required source truth |
|---|---|---|
| `CounterReveal.tsx` | Reveal a numeric value across an absolute frame interval | Verified number, unit and range |
| `WordHighlight.tsx` | Highlight the spoken word from CSV-derived intervals | `Recognized_Word` and frame JSON |
| `TimelineStrip.tsx` | Show events along a duration rail | Verified event dates/order |
| `ComparisonPanel.tsx` | Compare two supported states or business models | Comparable definitions/periods |
| `MetricCard.tsx` | Present one sourced KPI | Source label, value and unit |
| `QuoteReveal.tsx` | Reveal a supplied quotation with attribution | Exact quote and source/attribution |
| `CalloutLine.tsx` | Connect a visual point to a label | Correct anchor coordinates |
| `ImageMotion.tsx` | Locked / push / pull local image treatment | Local image and camera permission |
| `ProgressRail.tsx` | Indicate progress across a known duration | Exact composition duration |
| `StaggerList.tsx` | Reveal ordered causal/process steps | Valid step sequence |
| `SectionHeader.tsx` | Establish a chapter/scene hierarchy | Approved heading text |
| `SourceFootnote.tsx` | Display a source/period note | Actual source or source note |

## Integration rules

- Import only patterns that are used.
- Adjust all colors, fonts and metrics to the project `theme.ts`.
- Never hardcode a real statistic or source claim into a generic reusable component.
- Do not apply `ImageMotion` to a camera-locked reference.
- `WordHighlight` expects already validated frame intervals. It must not infer timing.
- `CounterReveal` is for a sourced number; do not animate a qualitative concept as a metric.
- A `TimelineStrip` requires actual ordering and frame positions, not invented chronology.
- The included `ImageMotion` uses local `staticFile()` paths only.
- Compile/render verification remains a FramePilot-stage task; this Skill does not create preview renders.
