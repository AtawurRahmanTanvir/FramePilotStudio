# Production Quality Rubric — Evidence-Based Review

Use this as a pass/fail review framework, not as an invented numerical score. Each item must be supported by the actual source or test. A project may be structurally complete and still have open visual/design risks.

## Editorial clarity
- [ ] Opening establishes a clear question, consequence or promise.
- [ ] Every section advances the story.
- [ ] The visual plan explains the mechanism, not just decorates the narration.
- [ ] Evidence and interpretation are distinguishable.
- [ ] The ending resolves the opening promise.

## Visual communication
- [ ] One primary focal point per scene.
- [ ] Hierarchy is clear at the target output size.
- [ ] Layouts vary according to narrative function without losing design consistency.
- [ ] No irrelevant graphics, fake data or misleading UI.
- [ ] Negative space is intentional and text safe areas are defined.

## Motion craft
- [ ] Motion has an explicit narrative or hierarchy purpose.
- [ ] Entrances and exits have intentional timing.
- [ ] Stagger reveals support reading order.
- [ ] Important information has adequate hold time.
- [ ] No unbounded overshoot or drifting chart/data values.
- [ ] No unnecessary constant motion.

## Asset and continuity integrity
- [ ] All mandatory assets are accounted for.
- [ ] Original filenames/serials are preserved in the manifest.
- [ ] Camera lock and master-reference geometry are respected.
- [ ] Historical/technical details match available sources.
- [ ] Reuse and exclusion are documented.

## Typography and language
- [ ] Display/body hierarchy is consistent.
- [ ] All text fits defined safe areas.
- [ ] Bengali/complex scripts use whole-word or phrase shaping, not code-point animation.
- [ ] Font file/license/fallback are documented.
- [ ] No claim of actual shaping correctness without a real renderer test.

## Engineering and packaging
- [ ] Manifest/Composition/dependency contract matches.
- [ ] Media paths are local and explicit.
- [ ] No secrets, caches, remote dependencies or render scripts.
- [ ] Project source is modular and deterministic.
- [ ] Static QA report distinguishes PASS from NOT RUN.

## Local render / human review (FramePilot stage)
These checks are intentionally outside Claude's Skill and must be completed after import/render:
- [ ] Import accepted by FramePilot.
- [ ] OS-level isolation gate passed.
- [ ] MP4 output and FFprobe verification passed.
- [ ] Full voiceover and tail are present.
- [ ] No missing assets, font substitution, overflow or unintended black frames.
- [ ] Long-form render and cancellation behavior meet expectations.
- [ ] Human reviewer approves the actual MP4.
