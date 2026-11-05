# Transition Engineering & Temporal Continuity

## 1. Supported Transition Archetypes

FramePilot Studio uses Remotion 4.0.540 with `@remotion/transitions`. Avoid arbitrary novelty wipes in favor of motivated cinematic cuts.

| Transition | Frame Budget | Motivation / Context |
|---|---|---|
| **Hard Cut** | 0 frames | Fast-paced montage, direct question/answer pairs, abrupt narrative turns |
| **Cross Dissolve** | 12 - 20 frames | Passage of time, psychological shift, thematic bridge |
| **Mask / Wipe Reveal** | 15 - 25 frames | New chapter, geographic movement, archival document unrolling |
| **Match Cut** | 0 - 6 frames | Visual rhyme between two objects of matching geometry across scenes |
| **Push / Slide** | 12 - 18 frames | Horizontal timeline advancement, sequential step progression |

---

## 2. Transition Implementation with Remotion 4.0.540

Using `@remotion/transitions` with `linearTiming`:

```tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';

export const DocumentaryTimeline: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={180}>
        <Scene01Opening />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />

      <TransitionSeries.Sequence durationInFrames={240}>
        <Scene02Exposition />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: 'from-left' })}
        timing={linearTiming({ durationInFrames: 18 })}
      />

      <TransitionSeries.Sequence durationInFrames={210}>
        <Scene03DataVisualization />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

---

## 3. Audio & SFX Synchronization Rules

- **Pre-Roll Sound Cues**: Whooshes, risers, and sweeps should begin 6 to 12 frames **before** the optical transition midpoint to create an organic psychoacoustic anticipation.
- **Impact on Arrival**: Impact hits or clicks must trigger exactly on the first frame of the incoming scene ($0\text{ms}$ error tolerance).
- **Audio Crossfade**: Never cut audio abruptly across video transitions. Maintain continuous room tone or environmental ambience beds underneath cuts.

