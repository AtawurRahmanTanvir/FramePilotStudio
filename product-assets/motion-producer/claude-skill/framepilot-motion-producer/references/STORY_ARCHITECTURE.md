# STORY_ARCHITECTURE.md
# FramePilot Motion Producer — Documentary Story Architecture

## Purpose

This document defines how Claude analyzes a documentary script to extract narrative structure, identify story beats, and plan a motion graphics sequence that serves the story — not just illustrates it.

---

## Documentary Narrative Model

Every documentary motion project has a **thesis**: a central claim or revelation the film is building toward. All visual and typographic decisions serve this thesis.

### Core Narrative Components

| Component | Definition | Motion Design Function |
|-----------|------------|----------------------|
| **Thesis** | The central argument or revelation | Drives opening and closing scenes |
| **Stakes** | Why this matters to the audience | Informs emotional color and pacing |
| **Evidence** | Facts, data, quotes that support thesis | Data scenes, quote cards, archival moments |
| **Turning Point** | The moment the story shifts | Scene type change, motion direction reversal |
| **Payoff** | The resolution or call to action | Closing scene type, final typography |

---

## Act Structure for Documentary Motion Graphics

### Four-Act Model

```
ACT 1: OPENING (10-15% of total duration)
  Purpose: Establish world, introduce stakes
  Scene types: opening, title-card
  Motion: slow, deliberate, wide establishing shots
  Typography: large display, sparse

ACT 2: CONTEXT & CONFLICT (25-35% of total duration)
  Purpose: Provide background, introduce the problem
  Scene types: exposition, map, timeline
  Motion: moderate pace, left-to-right information flow
  Typography: section headers, body text

ACT 3: EVIDENCE & REVELATION (35-45% of total duration)
  Purpose: Present proof, build to the turning point
  Scene types: data, quote, evidence, archival
  Motion: accelerating pace, cut rhythm tightens
  Typography: emphasized numbers, highlighted quotes

ACT 4: RESOLUTION (10-15% of total duration)
  Purpose: Land the thesis, provide closure
  Scene types: closing, call-to-action
  Motion: slows again, returns to opening visual language
  Typography: returns to display scale, final title
```

### Act Timing Formula

```
openingMs    = totalDurationMs * 0.12
contextMs    = totalDurationMs * 0.30
evidenceMs   = totalDurationMs * 0.43
resolutionMs = totalDurationMs * 0.15
```

> These are targets, not rigid boundaries. Scene boundary detection from CSV timing takes precedence. Adjust act boundaries to align with natural pause gaps.

---

## Identifying Story Beats

A **story beat** is a moment where the narrative shifts: a new piece of evidence appears, a speaker changes, the emotional tone shifts, or a key fact is revealed.

### Beat Extraction Rules

1. **Scan for semantic pivots**: words like "however," "but," "then," "despite," "as a result" signal transitions.
2. **Speaker changes** always create a beat.
3. **Date references** (years, months) in historical documentaries create temporal beats.
4. **Geographic shifts** (new location named) create spatial beats.
5. **Statistics** introduction creates an evidence beat.
6. **Direct quotes** (opening quotation marks or "he said") create quote beats.

### Beat Count Guidelines

| Script Length (words) | Expected Beat Count |
|----------------------|-------------------|
| < 150 words | 3–4 beats |
| 150–400 words | 4–6 beats |
| 400–800 words | 6–9 beats |
| 800–1500 words | 9–12 beats |
| > 1500 words | 12–16 beats |

> ⛔ Anti-pattern: Assigning a beat to every sentence. Beats are story-level shifts, not grammatical units. Over-segmenting creates visual noise and destroys pacing.

---

## Scene Count Formula

```
baseSceneCount = floor(totalDurationSeconds / 12)
minSceneCount  = floor(totalDurationSeconds / 20)
maxSceneCount  = floor(totalDurationSeconds / 6)
```

**Examples:**
- 60-second project: base 5, min 3, max 10 scenes
- 3-minute project: base 15, min 9, max 30 scenes
- 10-minute project: base 50, min 30, max 100 scenes

**Actual scene count** = max(beatCount, minSceneCount) clamped to maxSceneCount.

For long-form (>5 min), see `LONG_FORM_PERFORMANCE.md` for additional guidance.

---

## Handling Multiple Speakers

When a script contains 2+ speakers:

1. Each speaker gets a **consistent visual identity**: a specific text color accent, name lower-third position, or graphic element.
2. Speaker transitions always create scene boundaries.
3. If speakers are identified by name in the script (e.g., "Dr. Rahman says:"), extract and store in the editorial plan.
4. Anonymous speakers ("a witness recalls") get a generic visual treatment.
5. Narrator vs. interviewee: narrator uses full-screen typography; interviewee uses lower-third or quote card.

### Speaker Identity Map (example)

```json
{
  "speakers": [
    { "id": "narrator", "visualTreatment": "full-screen-body", "accentColor": null },
    { "id": "Dr. Rahman", "visualTreatment": "lower-third", "accentColor": "#c8a855" },
    { "id": "witness-anonymous", "visualTreatment": "quote-card", "accentColor": "#6b8fa3" }
  ]
}
```

---

## Handling Historical Periods

When a documentary spans multiple time periods:

1. Each period gets a **color temperature shift**: older periods trend warmer/desaturated, modern periods are cooler/saturated.
2. Year title cards introduce each period — these are mandatory scene inserts.
3. Archival content (photos from the period) gets a film-grain or sepia treatment applied via CSS filter.
4. Transitions between periods: use `wipe` or `reveal` (never `cut` — a cut implies same-time continuity).

### Period Color Mapping

| Era | Background Shift | Filter |
|-----|-----------------|--------|
| Pre-modern (before 1950) | +10% warmth, -20% saturation | `sepia(0.4) brightness(0.9)` |
| Mid-century (1950–1990) | Neutral | `brightness(0.95)` |
| Modern (1990–present) | Slight cool | None |

---

## Geographic Shifts

When the script mentions a new location:

1. Consider a **map scene** to orient the audience.
2. Map scenes should be brief (4–8 seconds) and functional — not decorative.
3. Location name appears as a typography overlay on the map.
4. After the map scene, resume narrative flow in the new location's visual context.

> ⛔ Anti-pattern: Inserting a map scene for every location mention. Only use when geographic context is essential to understanding the story.

---

## Subject Continuity

**Subject continuity** means the same person, object, or theme is visually recognizable across scenes.

Rules:
- If a person appears in multiple scenes, use the same photo (or same visual treatment) each time.
- Color associations established in Act 1 (e.g., blue = positive, red = conflict) must be maintained.
- If a visual metaphor is introduced (e.g., a river = time passing), reuse it at payoff moments.
- Never introduce a new visual metaphor in Act 4.

---

## Title Cards vs. Visual Metaphors vs. Data

| Use Case | Recommended Treatment | When to Use |
|----------|----------------------|-------------|
| Key fact (single sentence) | Title card — full-screen typography | When the fact alone carries emotional weight |
| Abstract concept | Visual metaphor (animated geometric shape, symbolic image) | When a literal image would be reductive |
| Numerical statistic | Data scene (animated counter or chart) | When magnitude matters to the argument |
| Duration or sequence | Timeline visualization | When order and time-distance matter |
| Geographic relationship | Map scene | When spatial context is non-obvious |
| Personal testimony | Quote card with attribution | When voice and authorship matter |

---

## Narrative Pacing: Fast/Slow Zones

### Slow Zones (longer scene durations)
- Opening establishing shot
- Revelation moments (let the fact land)
- Closing resolution

### Fast Zones (shorter scene durations, tighter cuts)
- Evidence accumulation sequences (3–5 quick data points)
- Historical event sequences
- Action or conflict moments

### Breath Points
Every 90–120 seconds of content, insert a **breath point**: a 3–5 second minimal scene (title card or single image) that gives the audience a moment of visual rest before the next information wave.

---

## Visual Metaphor Selection Rules

1. **Ground metaphors in the subject matter**: A documentary about water rights should use water imagery, not abstract shapes.
2. **Avoid clichés**: No lightbulb for "idea," no puzzle pieces for "complexity."
3. **Metaphors must be legible at a glance**: If it requires 3 seconds to decode, it's too complex.
4. **One dominant metaphor per act** maximum.
5. **Document the metaphor** in the scene plan under `visualObjective`.

---

## Anti-Patterns

> ⛔ Anti-pattern: **Over-segmenting** — breaking a 90-second script into 15 scenes. This creates a choppy, incoherent visual rhythm. Minimum average scene duration is 8 seconds.

> ⛔ Anti-pattern: **Random scene types** — assigning scene types without reference to narrative function. Every scene type must map to a narrative purpose.

> ⛔ Anti-pattern: **Ignoring the narrative arc** — treating the motion project as a slideshow of text. The visual sequence must mirror the emotional arc of the script.

> ⛔ Anti-pattern: **Front-loading complexity** — putting data-heavy scenes in Act 1 before the audience is emotionally invested.

> ⛔ Anti-pattern: **Missing the payoff** — ending on an exposition scene. The final scene must land the thesis.

---

## Cross-References

- Scene type definitions and boundaries → `SCENE_PLANNING.md`
- Script parsing methods → `SCRIPT_ANALYSIS.md`
- Visual direction by scene type → `VISUAL_DIRECTION_SYSTEM.md`
- Long-form specific rules → `LONG_FORM_PERFORMANCE.md`
