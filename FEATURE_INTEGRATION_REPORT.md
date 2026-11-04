# FramePilot Studio Feature Integration Report

Validation date: 2026-11-04

## Feature matrix

| Feature | UI Exists | Backend Exists | IPC Connected | Actual Operation Wired | Remaining Work |
|---|---:|---:|---:|---:|---|
| Filmora Overview | Yes | Yes | Yes | Yes | Functional regression on a real project remains to be performed. |
| Filmora Script-to-Image Mapping | Yes | Existing external ChatGPT workflow | Yes | Yes | The user must attach the selected script manually in ChatGPT. |
| Filmora Audio to CSV | Yes | Existing Filmora backend | Yes | Yes | Packaged offline model validation remains environment-dependent. |
| Filmora Timeline | Yes | Existing WFP analysis/export backend | Yes | Yes | Functional regression on a real project remains to be performed. |
| Motion Overview | Yes | Yes | Yes | Yes | Separate Settings/Diagnostics screens are not present; runtime status is shown in the existing overview and render panels. |
| Motion Word Timing | Yes | Yes | Yes | Yes | No verified offline ASR/alignment model is staged; Bengali is unsupported. |
| Claude Project Kit | Yes | Yes, prompt files | Yes | Yes | Claude remains an external manual attachment workflow by design. |
| Motion Project Import | Yes | Yes | Yes | Yes | Additional adversarial ZIP fixtures and clean-machine testing remain. |
| Motion Project Manager | Yes, embedded in Overview/Import | Yes | Yes | Yes | No separate manager screen; rename, duplicate, delete, folder-open and refresh are wired. |
| Live Preview | Yes | Remotion worker exists | Yes | Partially | Current preview displays a verified rendered MP4. The actual `@remotion/player` cannot be enabled until imported-code isolation is implemented and validated. |
| Render Studio | Yes | Yes | Yes | Blocked by security gate | Rendering remains disabled until Windows-enforced isolation and network denial pass adversarial tests. |
| Render History | Yes, embedded in Render Studio | Yes, persistent JSON history | Yes | Yes | History is local to the Motion Projects workspace; cleanup and long-video stress testing remain. |
| Motion Settings | No separate Motion screen | Runtime detection exists | Runtime IPC exists | Partial | No Motion-specific mutable settings/model-manager UI exists. |
| Motion Diagnostics | Shared Activity & QA screen | Runtime/error events exist | Job event/log IPC exists | Partial | No separate Motion diagnostics screen exists; detailed render/import logs are sent to shared activity logging. |

## Preserved boundaries

- Filmora renderer source, Filmora backend modules, the original master prompt, and the Filmora CSV/WFP operation paths were not refactored.
- Motion Word Timing uses its independent five-column CSV and companion QA JSON format.
- Imported project code is statically inspected and is not executed during inspection or extraction.
- Unsafe rendering remains fail-closed. No policy file was marked validated.

## Implemented integration changes

- Added persistent Motion render-history storage at the Motion Projects workspace.
- Added `motion:list-render-history` through the restricted preload bridge.
- Added real render-history listing with output existence checks and Show in Folder actions.
- Render completion now records mode, project, timestamp, output path, frame count, duration and output size.
- Remotion worker output verification remains required before a render is recorded.

## Evidence

- `npm test`: passed, 20 Python tests and 4 Node tests.
- `npm run test:node`: passed, 4/4.
- Motion Python tests: passed, 15/15.
- JavaScript syntax checks: passed for main, preload, Motion renderer and worker files.
- `git diff --check`: passed.
- `npm run build:dir`: passed.
- Electron executable remained running for a 10-second startup check.
- Real Remotion fixture bundled and rendered a 30-frame MP4 plus first-frame PNG; FFprobe verified 1.0 seconds and 5,442 bytes.
- `npm run preflight`: correctly fails closed because Windows worker isolation is not validated.

## Release blockers

1. Windows-enforced project-only filesystem isolation and outbound network denial are not implemented or independently tested.
2. Motion rendering and actual Remotion Player execution must remain disabled until blocker 1 passes.
3. Offline ASR/alignment models are not staged and no production alignment language is currently certified.
4. Bengali alignment is not implemented or certified.
5. Filmora functional regression using a copied real project has not been performed in this checkout.
6. Clean-machine packaging, audio/SFX rendering, cancellation stress, long-form rendering and visual review remain outstanding.
