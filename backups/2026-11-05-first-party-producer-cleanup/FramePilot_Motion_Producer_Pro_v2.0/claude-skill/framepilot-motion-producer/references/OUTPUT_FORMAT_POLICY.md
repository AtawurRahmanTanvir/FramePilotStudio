# Output Format and Composition Policy

## Defaults

- Default if unspecified: 1920×1080, 16:9, 30 FPS.
- User-specified dimensions and FPS override defaults.
- Use exact integer dimensions. Keep FPS as the requested supported numeric value.
- Duration comes from verified voiceover metadata plus any deliberate visual tail.

## Common formats

| Format | Example dimensions | Design implications |
|---|---:|---|
| 16:9 | 1920×1080 | Wide hierarchy, horizontal comparisons and documentary layouts |
| 9:16 | 1080×1920 | Single-column information, vertical safe zones and larger text |
| 1:1 | 1080×1080 | Centered hierarchy, shorter lines and balanced crop |
| 4:5 | 1080×1350 | Portrait feed layout with careful vertical spacing |

These are examples, not permission to override a user-specified exact size.

## Multiple aspect ratios

Do not crop one composition blindly into multiple ratios. If the user requests multiple formats, define separate compositions/layout plans with shared content data and explicit reframing. Keep the scene/asset IDs consistent.

## Safe-area policy

Define safe margins as proportions of width/height rather than reusing fixed pixel positions. Account for platform UI overlays where the brief identifies the destination. Never put essential words, numbers or evidence at the frame edge.

## Frame duration

`durationInFrames = ceil(audioDurationMs × fps / 1000)` when audio duration is verified. Add visual tail only when explicitly designed. If duration metadata is unavailable, record that the last CSV end is only a lower bound.
