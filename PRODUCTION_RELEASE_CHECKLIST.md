# Production Release Checklist

Validation date: 2026-11-04

## Status legend

- **Implemented**: source path exists.
- **Passed**: executed successfully in this environment.
- **Blocked**: intentionally unavailable because a prerequisite is missing.
- **Not tested**: no evidence was collected.

## Application and preservation

| Area | Status | Evidence or blocker |
|---|---|---|
| Electron main process loads | Passed | `node --check src/main/main.js`; startup smoke test remained alive for 12 seconds |
| Motion IPC registration | Passed | 25 handlers registered, 25 unique |
| Empty render history | Passed | Absent history file returns `[]` |
| Filmora source boundaries | Implemented | Filmora modules and IPC paths were not refactored |
| Filmora real-project regression | Not tested | Requires a representative user project/fixture |
| Existing user data preservation | Implemented | Atomic registries, collision-safe outputs, no overwrite by renderer |

## Motion workflow

| Area | Status | Evidence or blocker |
|---|---|---|
| Word Timing validation and QA output | Passed | Motion test suite: 15/15 |
| Project ZIP validation/import | Passed | Motion test suite covers extraction and validation paths |
| Project registry and render history | Implemented | Persistent JSON storage and atomic writes |
| Claude Project Kit | Implemented | Existing prompt-kit IPC and UI path |
| Safe MP4 preview | Implemented | Existing verified video preview |
| Actual Remotion Player | Blocked | Imported JavaScript cannot safely execute in the renderer yet |
| Imported-project rendering | Blocked | Windows isolation is not implemented and validated |

## Runtime and packaging

| Area | Status | Evidence or blocker |
|---|---|---|
| Pinned runtime metadata | Passed | Node 22.23.4, Chrome 157.0.8103.38, Remotion 4.0.540 |
| Runtime verify-only check | Passed | `powershell -File tools\INSTALL_MOTION_RUNTIME.ps1 -VerifyOnly` |
| Directory build | Passed | `npm run build:dir` |
| Clean-checkout installation | Blocked | Official Chrome download did not complete in this environment |
| GUI runtime install/repair | Implemented | Motion UI invokes `motion:manage-runtime`; packaged installer is included under `runtime/motion/INSTALL_MOTION_RUNTIME.ps1` |
| Offline-after-install verification | Not tested | Requires network-disabled runtime test |
| Windows installer install/uninstall/upgrade | Not tested | Clean Windows installation environment unavailable |

## Security release gate

**Fail closed.** Do not create a validated worker policy or distribute imported
project rendering until filesystem isolation, outbound network denial, process
containment, resource limits, cleanup, and adversarial tests pass on supported
Windows x64.

See [MOTION_SECURITY_AUDIT.md](./MOTION_SECURITY_AUDIT.md).
