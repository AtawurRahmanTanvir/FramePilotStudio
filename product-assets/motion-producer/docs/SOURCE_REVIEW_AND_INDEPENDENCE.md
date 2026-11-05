# Source Review, Product Decisions and Independence Statement

## Material reviewed

This package was designed after reviewing:

1. The user-supplied `claude-remotion-skill-main` source ZIP.
2. The public README and file structure of `haidrrrry/claude-remotion-skill`.
3. The supplied `FramePilot_Motion_Studio_Overlay_v0.1.4.zip`, including its CSV specification, Claude project instructions, project-import contract, motion master prompt and implementation brief.
4. The existing FramePilot Motion Producer v1.0 draft and its sample CSV.

## Findings from the upstream skill

The upstream project publicly describes a motion-design craft framework built around spring/eased animation, staggered choreography, multi-property entrances, layered grading, still-image camera treatment, word-synchronized captions, audio design and a render/inspect/fix loop. It includes a main Skill, motion-pattern references, design rules, theme assets and demonstration projects.

Those are useful problem categories to study. They do not define the FramePilot product boundary. The upstream workflow expects Claude-side render/inspect behavior; this package deliberately does not. FramePilot is the trusted local render destination, so Claude produces code and static QA only.

## Findings from the supplied FramePilot overlay

The supplied overlay already establishes the important product-specific boundary:

- Motion has a separate five-column word-timing CSV.
- Filmora has a different 21-column Final Master CSV and must stay separate.
- The import manifest is `motion-project.json` at ZIP root.
- The Remotion runtime baseline was pinned to Remotion `4.0.540`, React `19.1.0` and React DOM `19.1.0`.
- Imported project code is untrusted and must remain behind a real Windows isolation boundary.
- The final render should run through FramePilot's bundled local worker, not via global developer tools.

This package is aligned to that contract rather than inventing a parallel product format.

## What is original in this package

- A FramePilot-specific division of responsibilities.
- A structured documentary/editorial planning system.
- A five-column CSV interpretation and timing-QA workflow.
- Scene coverage, asset preservation, continuity and fact-visualization records.
- A local-only Remotion project contract.
- A Claude no-render boundary with FramePilot-only final render handoff.
- Static project ZIP validation and packaging utilities.
- A reusable micro-command vocabulary and team handoff process.
- A modular FramePilot starter source project.

No upstream source code, demo video, demo GIF, logo, branded artwork, sample scene source or copied motion-pattern implementation is bundled. The package uses general software/animation principles expressed in a new FramePilot-specific structure.

## Product decisions

1. **One source of truth for spoken timing:** FramePilot's five-column CSV.
2. **One render destination:** FramePilot Studio, local PC.
3. **One deliverable per production job:** one complete Remotion project ZIP.
4. **No preview workflow in Claude:** source/static validation only.
5. **No Filmora refactor:** Filmora and Motion schemas remain isolated.
6. **Fail closed:** static package validation never authorizes execution.
7. **Preserve all mandatory assets:** no convenience-based image count reduction.
8. **Honest readiness:** no Bengali, sandbox, render, long-form performance or visual QA certification without the corresponding real test.

## Video reference limitation

The supplied YouTube URL (`42fYir1OeMQ`) could not be fetched in this environment. The package therefore does not claim to have reproduced or verified that video's stages. The workflow is based on the accessible source material above. If the video must be analyzed at chapter/timestamp level, the user should supply a transcript, screenshots or a locally provided copy/notes.

## References

- Upstream repository: https://github.com/haidrrrry/claude-remotion-skill
- Claude Skills: https://support.claude.com/en/articles/12512198-how-to-create-custom-skills
- Use Skills in Claude: https://support.claude.com/en/articles/12512180-use-skills-in-claude
