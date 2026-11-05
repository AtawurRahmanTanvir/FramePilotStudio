# FramePilot Motion Producer — Reusable Micro-Command Vocabulary

These are concise instructions the team can append after invoking the Skill. They are not separate scripts and do not replace the full Skill.

## `/fp-plan`
Analyze the full script, voiceover and CSV. Return editorial architecture, scene coverage and risk register before coding. Do not write a Remotion project yet unless the user asks for one-pass production.

## `/fp-produce`
Execute the full pipeline in one pass: source inventory, CSV QA, editorial architecture, scene plan, asset map, Remotion source, static validation and one project ZIP. Do not render in Claude.

## `/fp-assets`
Audit every supplied asset. Preserve original filenames and serial numbers. Produce an exact included/unused/reused list and scene mapping. Do not delete or reduce assets.

## `/fp-continuity`
Audit camera lock, geography, object identity, chronology, scale, perspective and repeated visual anchors. Report violations and update the continuity register. Do not introduce camera movement where the master reference requires a lock.

## `/fp-timing`
Validate the exact five-column CSV, preserve source rows and compute absolute Remotion frame intervals. Report missing speech, script/recognized mismatches, overlaps and untimed words. Never create SRT/VTT.

## `/fp-motion-audit`
Review motion grammar, easing, entrance/exit choreography, hierarchy, hold time, pacing, visual repetition, readability and frame-safe bounds. Suggest source changes only; do not render a preview.

## `/fp-factual-audit`
Check every date, numeric value, name, location and factual visual against supplied source material. Separate confirmed facts, user-provided claims, design abstraction and unknowns. Do not invent data.

## `/fp-static-qa`
Run available deterministic validators. Report the exact checks and exit codes. Do not claim render, visual or sandbox verification.

## `/fp-handoff`
Create or verify the one import-ready ZIP, root manifest, README, asset/timing/scene reports, static QA and final FramePilot handoff instruction.

## `/fp-revise`
Use the supplied FramePilot error report or human review notes to make a minimal targeted revision. Preserve all unaffected assets and source data. Re-run the relevant static checks and deliver a versioned ZIP.

## `/fp-no-render`
Reassert the hard boundary: no MP4, GIF, preview, still render, frame extraction loop, Remotion render command or local render instruction in Claude. Final rendering is FramePilot-only.
