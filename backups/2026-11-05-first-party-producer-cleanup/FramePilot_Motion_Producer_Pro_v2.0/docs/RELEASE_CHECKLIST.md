# Release Checklist

## Skill package
- [ ] `SKILL.md` exists at the root of the skill folder.
- [ ] Frontmatter `name` matches the folder name.
- [ ] Description states both capability and activation context.
- [ ] All referenced files exist.
- [ ] Scripts use standard library only unless explicitly documented.
- [ ] Claude Skill ZIP contains exactly one top-level skill folder.
- [ ] No upstream demo assets, code or branded artwork are repackaged.

## Example project
- [ ] `motion-project.json` is at root.
- [ ] Entry file calls `registerRoot`.
- [ ] Composition ID/dimensions/FPS/duration match manifest.
- [ ] Dependency versions are exact.
- [ ] No render API calls or external shell commands.
- [ ] No remote assets or fonts.
- [ ] Source is modular and deterministic.

## Utilities
- [ ] CSV validator passes all included fixtures.
- [ ] Frame converter handles fractional timestamps and FPS.
- [ ] Project ZIP validator rejects traversal and duplicate paths.
- [ ] Package builder preserves ZIP root and excludes caches/secrets.
- [ ] Unit tests pass.

## FramePilot integration
- [ ] Copy Master Instructions works.
- [ ] Save Instructions works through a native save dialog.
- [ ] Save Skill works byte-for-byte.
- [ ] Open Claude opens only the official site.
- [ ] No automatic media upload or external network transfer.
- [ ] One-click local render remains behind the Windows security gate.
- [ ] Filmora regression remains intact.

## Truthful release label

A package-level release can be labelled `Skill package assembled and static tests passed`. It cannot be labelled `FramePilot production rendering certified` until the app has imported and rendered a real project under the approved OS sandbox and passed real long-form, audio, cancellation and clean-machine tests.
