# Static QA — Starter Example

| Check | Result | Notes |
|---|---|---|
| Manifest present at root | PASS | `motion-project.json` |
| Manifest and Composition ID | PASS | Both use `Main` |
| Dimensions / FPS / duration | PASS | 1920×1080 / 30 / 900 frames |
| Pinned dependencies | PASS | Remotion 4.0.540, React 19.1.0 |
| Entry registration | PASS | `src/index.tsx` calls `registerRoot` |
| Local media only | PASS | No remote asset path |
| Voiceover | NOT APPLICABLE | Example is text-only |
| Real project CSV | NOT APPLICABLE | CSV contains synthetic sample tokens |
| Render / visual QA | NOT RUN | Claude must not render |
| Windows sandbox | NOT RUN | Must be verified by FramePilot |

This report describes static source inspection only. It is not a render, visual QA or security certification.
