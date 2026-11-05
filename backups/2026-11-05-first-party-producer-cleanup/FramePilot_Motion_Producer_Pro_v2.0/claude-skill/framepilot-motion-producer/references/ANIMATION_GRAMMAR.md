# Animation Grammar and Micro-Level Motion Specification

## 1. Timing source

Every time value must be derived from one of:

- Word CSV absolute milliseconds.
- Verified audio duration.
- Scene plan absolute milliseconds.
- An explicit design duration stated in the brief.

Convert to frames only at the composition boundary. Do not scatter unexplained magic frame numbers through scene files. Put shared durations/easings in theme or motion-token modules.

## 2. Entrance grammar

A purposeful entrance typically changes two properties, sometimes three:

- Position + opacity.
- Scale + opacity.
- Mask reveal + position.
- Shape/path reveal + opacity.

Avoid the same fade-up on every element. Entrance should communicate source, weight and hierarchy. A heavy object should not bounce like a notification badge.

## 3. Stagger grammar

Stagger only elements that form a meaningful reading sequence. Set the stagger interval from the required reading order and screen density. If the scene has more information, use grouped reveals rather than dozens of tiny staggered items. Avoid simultaneous appearance of every layer.

## 4. Hold and exit grammar

Every important information element needs enough hold time to read at its display size. Exits should be deliberate and generally faster than entrances, but must not interrupt narration or hide a new claim. Do not animate content out before the viewer has had time to process it.

## 5. Easing and spring discipline

- Use `spring()` for tactile elements, but set damping/mass/stiffness intentionally.
- Use bounded `interpolate()` for controlled camera and editorial motion.
- Prefer eased curves for camera travel and typography reveals.
- Use `clamp` extrapolation for elements that must not drift outside a safe range.
- Avoid unbounded overshoot in chart bars, counters, map markers, data labels and text.
- Do not animate every parameter at once.

## 6. Transform order

Apply transform operations consistently. Document the coordinate anchor for scale/rotation. A centered scale and a bottom-anchored scale create different visual movement; choose intentionally. Do not accidentally move the focal point when animating a container.

## 7. Transition grammar

Use a transition because the narrative changes, not because a library offers an effect. Supported transition intents:

- `motivated-cut` — immediate change on a new thought/evidence.
- `match-cut` — shared shape, scale or direction connects two scenes.
- `directional-wipe` — reveals a process or spatial shift.
- `masked-reveal` — introduces an object or document.
- `cross-dissolve` — only when continuity or time passage benefits.
- `graphic-bridge` — a line, map path or shape carries meaning between beats.
- `hold-to-black` — deliberate pause or chapter close.

Avoid stacked transitions and overlong cross-fades that weaken the pace.

## 8. Camera micro-movement

For camera moves, define start/end scale, position, easing, subject anchor and motion limits. Slow movement must remain visible but not distract. A fixed-camera brief overrides any recommendation to move the camera.

## 9. Micro-motion

Use subtle ambient motion only when it reinforces depth or life: a restrained light drift, soft particle drift, gently breathing indicator or slow environmental movement. No random jitter, excessive floating icons, endless sine-wave movement or decorative motion competing with the narration.

## 10. Data and counter animation

Counters must:

- Use a verified source value and unit.
- Specify start value and end value.
- Reach the exact target on the correct frame.
- Use numeric tabular figures.
- Keep labels visible throughout the reveal.
- Avoid implying a linear time series if the number is a single snapshot.

Chart bars must preserve baseline and scale. Never animate values to a false endpoint for drama.

## 11. Timing validation

For every word-synced or scene-synced element:

- Use the absolute start/end time.
- Keep start inclusive/end exclusive frame semantics.
- Prevent negative or zero-length frame ranges.
- Flag overlap rather than rewriting input.
- Do not assume one frame per word.
