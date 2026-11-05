# Scene Planning & Temporal Segmentation

## Overview

Scene planning translates the narrative script and Word Timing CSV into a structured, chronological sequence of visual scenes. Each scene corresponds to a distinct editorial beat, visual focus, and timing interval.

---

## 1. Scene Boundary Rules

1. **Word-Interval Grounding**: Every scene boundary must correspond exactly to a word's `Start_ms` or `End_ms` in the canonical 5-column CSV.
2. **Pause Utilization**: Use natural voiceover pauses (>350ms silence between words) as primary candidates for scene cuts.
3. **Minimum Scene Duration**: 60 frames (2.0 seconds at 30fps) to ensure typography and motion are legible.
4. **Maximum Scene Duration**: 450 frames (15.0 seconds at 30fps) without an internal visual shift, camera push, or kinetic punctuation.
5. **Full Coverage**: Every word index from `1` to `N` must belong to exactly one scene. No gaps, no overlaps.

---

## 2. Scene Plan Schema (`project-data/scene-plan.json`)

The project must include `project-data/scene-plan.json` structured as follows:

```json
{
  "schemaVersion": "1.0",
  "totalScenes": 5,
  "fps": 30,
  "totalDurationInFrames": 1800,
  "scenes": [
    {
      "sceneId": "scene-01",
      "index": 1,
      "title": "Cold Open / Hook",
      "type": "opening",
      "wordIndexStart": 1,
      "wordIndexEnd": 28,
      "startMs": 0,
      "endMs": 6840,
      "startFrame": 0,
      "durationInFrames": 205,
      "narrative": "Establish the stakes and introduce the protagonist.",
      "visualObjective": "Atmospheric reveal of the primary archival artifact.",
      "primarySubject": "Archival Blueprint",
      "composition": "Centered dramatic focus with soft dark vignette",
      "motion": "Slow camera push-in (scale 1.0 -> 1.06) with subtle parallax",
      "typography": [
        {
          "text": "1942: THE TURNING POINT",
          "startFrame": 15,
          "durationInFrames": 90,
          "style": "display-headline"
        }
      ],
      "sfxEvents": [
        {
          "family": "whoosh",
          "path": "sfx/whoosh_0.wav",
          "startFrame": 0,
          "volume": 0.45
        },
        {
          "family": "reveal",
          "path": "sfx/reveal_0.wav",
          "startFrame": 12,
          "volume": 0.60
        }
      ],
      "transitionIn": "fade",
      "transitionOut": "match-cut"
    }
  ]
}
```

---

## 3. Scene Types & Editorial Roles

| Type | Pacing | Dominant Visual Elements | SFX Role |
|---|---|---|---|
| `opening` | Restrained, atmospheric | Title card, hero artifact, dark gradient | Reveal, subtle low hit |
| `exposition` | Steady, informative | Multi-column layout, archival imagery, quotes | Transition sweep, paper texture |
| `data` | Crisp, precise | Animated chart, counter, statistical callout | Click, digital UI tone |
| `quote` | Paced, focused | Clean typographic layout, speaker attribution | Soft sweep, subtle tone |
| `map` | Deliberate, spatial | Map animation, travel line, location pins | Shutter, UI accent |
| `timeline` | Sequential, chronological | Horizontal or vertical rail, event nodes | Mechanical click, subtle sweep |
| `closing` | Resonant, definitive | Summary cards, logo/call to action | Low hit, fade to silence |

---

## 4. Frame Calculation Formula

To convert milliseconds to Remotion frame numbers at standard FPS ($F = 30$):

$$\text{frame} = \operatorname{round}\left(\frac{\text{ms} \times \text{FPS}}{1000}\right)$$

Always ensure the sum of all scene `durationInFrames` equals the total project `durationInFrames`.

---

## 5. Continuity and Transition Strategy

- **Motion Direction Continuity**: If Scene 1 ends with a rightward camera pan, Scene 2 must either continue the rightward vector or cut to a stable static framing. Avoid jarring opposing vectors without an intervening hard cut.
- **Color Temperature Continuity**: Maintain uniform background tones (e.g. graphite dark `#0d0d10`) across consecutive scenes to preserve visual cohesion.
- **Typographic Anchor**: Keep secondary markers (e.g. section counters, source footnotes) in fixed screen coordinates across scenes.

