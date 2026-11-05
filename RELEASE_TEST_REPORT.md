# Release Test Report

Validation date: 2026-11-04
Environment: Windows x64 development machine, repository `E:\FramePilot_Studio`

## Executed tests

| Command | Result |
|---|---|
| `npm test` | Passed: 20 Python tests and 4 Node tests |
| `npm run test:node` | Passed: 4/4 |
| `python -m unittest discover -s tests\motion -p "test_*.py" -v` | Passed: 15/15 |
| `python -m py_compile backend\motion\sandbox_launcher.py tools\check_release_runtime.py` | Passed |
| `node --check src\main\motion-service.js` | Passed |
| `node --check src\preload\preload.js` | Passed |
| `node --check src\renderer\motion-studio\motion-studio.js` | Passed |
| `powershell -File tools\INSTALL_MOTION_RUNTIME.ps1 -VerifyOnly` | Passed |
| `npm run build:dir` | Passed |
| `npm run preflight` | Expected failure: missing unvalidated worker policy |
| Fail-closed launcher invocation | Passed: refused execution, exit code 78 |
| Electron startup smoke test | Passed: process alive after 12 seconds |
| IPC registration harness | Passed: 25 handlers, no duplicates |
| Empty render-history harness | Passed: `[]` |
| Controlled Remotion fixture render | Passed: 30 frames, 320x180, 30 FPS; FFprobe verified MP4 |
| Controlled render cancellation cleanup | Passed: root and `esbuild` child exited; no final or `.tmp.mp4` remained |
| Bundled one-click render path | Passed: pinned Node worker rendered 900 frames/30 seconds; FFprobe reported 30.000000 seconds and 60,711 bytes; test output cleaned |

## Expected preflight failure

`npm run preflight` stops before expensive manifest hashing because
`runtime\motion\security\worker-policy.json` is absent. This is intentional:
the application must not report release readiness while the Windows security
boundary is unverified.

## Not executed or blocked

- Windows filesystem and network adversarial tests: no enforceable worker
  boundary exists yet.
- Process-tree, CPU, memory and process-count isolation stress tests: no
  validated isolated worker exists.
- Clean-checkout runtime installation: official Chrome download did not
  complete in this environment.
- Filmora real-project regression: representative project fixture unavailable.
- Offline network-disabled workflow: not executed.
- Installer install/uninstall/upgrade: clean Windows environment unavailable.
- Long-form 20–30 minute render: not executed.
- Bengali alignment: unsupported and not certified.

## Release assessment

The application is suitable for continued development and safe Motion import,
project management, word-timing, runtime verification, and MP4 preview testing.
It is **not production-ready for imported Remotion rendering** and should not
be labeled production-ready until the security blockers are independently
verified.
