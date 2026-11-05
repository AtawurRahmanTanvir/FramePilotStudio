# Long-Form Production and Asset-Scale Discipline

## 1. Duration model

Calculate duration from audio metadata, then convert once:

`durationInFrames = ceil(audioDurationMs × fps / 1000)`

At 30 FPS, reference durations are:

- 10 minutes: 18,000 frames.
- 20 minutes: 36,000 frames.
- 30 minutes: 54,000 frames.

These are arithmetic references, not performance certifications. Do not claim a project can render at a particular length until the real FramePilot runtime has completed a representative test on the target hardware.

## 2. Asset count integrity

If the production brief calls for all supplied assets, preserve all of them. Long-form work is not an excuse to reduce 500+ images to 100 images. Track every file in the asset manifest and record scene coverage. An image can be reused deliberately, but reuse does not replace a mandatory serial in a historical/evolution sequence.

## 3. Asset size and derivatives

- Record original dimensions and byte size when metadata tools are available.
- Preserve original files and names.
- Do not resize, recompress, recolor or crop source originals destructively.
- If render-friendly derivatives are required and the user permits them, create them as additional files with an explicit `sourceFilename → derivativePath` mapping.
- Document derivative dimensions, format, quality/alpha assumptions and any crop.
- Do not silently reduce image quality to meet an archive-size target.

## 4. Scene architecture for long timelines

- Break the video into data-driven scenes/chapter modules.
- Use stable scene IDs and absolute `from` frame positions derived from the scene plan.
- Avoid a monolithic composition file with thousands of inline conditionals.
- Avoid mapping large data arrays inside components on every frame when data can be computed once.
- Keep the number of simultaneously visible high-resolution assets as low as the scene design permits.
- Use explicit `Sequence` boundaries and component responsibilities.
- Maintain a complete coverage map across all narration sections.

## 5. Timing robustness

- Derive all scene positions from absolute milliseconds and FPS.
- Do not cumulatively add rounded scene durations if this causes drift.
- Keep final narration end and visual tail explicit.
- Check that the last planned scene does not end before the verified audio end.
- Flag gaps and overlaps; do not make timing edits to hide them.

## 6. Complexity budget

Prefer the least expensive visual treatment that achieves the editorial goal. Use blur, shadow, grain, displacement and large filter stacks selectively. Avoid dozens of animated filters on hundreds of full-resolution stills. Use a small number of meaningful moving layers rather than making every object move independently.

## 7. Long-form static report

Record:

- voiceover duration source,
- total frames,
- scene count,
- supplied asset count,
- included asset count,
- images/video referenced in code,
- unused/reused assets,
- largest file sizes if known,
- known decoding/compositing risks,
- whether font shaping was tested,
- whether an actual long-form local render was performed (usually `NOT RUN` at Claude stage).

## 8. Performance honesty

The Skill cannot predict reliable render speed from source file count alone. Final performance depends on source dimensions, codecs, scene complexity, filters, memory, GPU/CPU, browser/compositor version and runtime configuration. Only FramePilot's actual local render log can establish observed performance.
