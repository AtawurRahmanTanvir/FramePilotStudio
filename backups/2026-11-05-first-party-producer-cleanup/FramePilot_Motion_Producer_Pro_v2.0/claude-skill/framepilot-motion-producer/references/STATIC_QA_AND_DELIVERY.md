# Static QA, Project Packaging and Handoff

## Status vocabulary

Use only these status labels:

- `PASS` — the check was executed and passed.
- `PASS_WITH_WARNINGS` — execution passed with recorded warnings.
- `FAIL` — the check was executed and failed.
- `NOT RUN` — not executed.
- `BLOCKED` — required input/runtime/tool was unavailable.
- `NOT APPLICABLE` — the check does not apply.

## Static QA checklist

### Source integrity
- [ ] Approved script identified.
- [ ] Voiceover identified and duration source recorded.
- [ ] Original CSV copied unchanged and hash recorded.
- [ ] Optional FramePilot QA JSON preserved and inspected separately.
- [ ] Every supplied asset accounted for.
- [ ] Original filenames and numeric serials preserved.
- [ ] Source conflicts and unresolved facts recorded.

### Timing
- [ ] Exact five-column header verified.
- [ ] Word indices positive and unique.
- [ ] Numeric timestamps finite and non-negative.
- [ ] End time greater than start time.
- [ ] Missing recognized words and untimed rows recorded.
- [ ] Script/recognition mismatches recorded.
- [ ] Overlaps and non-monotonic order recorded.
- [ ] Frame intervals derived from absolute timestamps.
- [ ] Audio duration compared with timing coverage.

### Visual and scene coverage
- [ ] Every script section maps to one or more scenes.
- [ ] Every scene has a narrative function.
- [ ] Every mandatory asset is accounted for.
- [ ] No arbitrary asset-count reduction.
- [ ] Chart values and date labels have sources.
- [ ] Continuity/camera-lock rules are explicit.
- [ ] Aspect-ratio safe zones are defined for the requested output.

### Project contract
- [ ] `motion-project.json` at ZIP root.
- [ ] Manifest and Composition metadata agree.
- [ ] `src/index.tsx` calls `registerRoot`.
- [ ] All source modules and local assets exist.
- [ ] Exact dependency pins match FramePilot runtime.
- [ ] No package lifecycle scripts.
- [ ] No `node_modules`, `.git`, caches, secrets or runtime binaries.
- [ ] No absolute machine paths or path traversal.
- [ ] No remote media/font URLs.
- [ ] No render API calls or shell render commands.

### Source integrity / safety
- [ ] Imported project source was not executed during inspection.
- [ ] Static project ZIP validation was executed or marked NOT RUN.
- [ ] No false claim that static validation proves Windows sandbox isolation.
- [ ] No credentials, cookies or private paths were packaged.

### Delivery
- [ ] One ZIP with manifest at root.
- [ ] README and static QA report included.
- [ ] Asset, timing, scene, continuity and decision records included.
- [ ] ZIP opens and archive entry list is checked.
- [ ] Project is ready for FramePilot import, subject to the app's security gate.

## What static QA cannot prove

Without running the project in FramePilot's approved environment, do not claim:

- The Remotion bundle succeeds.
- The final MP4 renders.
- The audio is audible or correctly mixed.
- Fonts shape Bengali correctly in the actual bundled browser.
- Visual text overflow or composition defects are absent.
- Long-form render performance is acceptable.
- An imported project is safe to execute.

The skill deliberately does not render previews or final output. User-facing visual validation occurs after the final local render in FramePilot. If the user provides a rendered MP4 and asks for review, analyze the provided MP4 as a separate review task; do not imply the Skill produced it.

## Required `STATIC_QA_REPORT.md`

Include a table with each check, status, exact command or method, count/result, and notes. Separate automated, manual and not-run checks. Include the tool versions if actually read. Record all unresolved issues.

## Final wording

Use:

> The Remotion project source package passed the listed static checks. The final MP4 was not rendered by Claude. Import the ZIP into FramePilot Studio and click RENDER VIDEO.

Do not say:

- “Video render successful”
- “Visual QA passed”
- “All frames verified”
- “Production ready”

unless the appropriate renderer/reviewer executed and reported the result.
