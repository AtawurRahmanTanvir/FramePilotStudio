# Motion Security Audit

Validation date: 2026-11-04

## Executive decision

Motion project import is enabled, but execution of imported Remotion code is
blocked. The repository does not yet contain a Windows-enforced project-only
filesystem and network boundary, so the security gate must remain closed.

No `worker-policy.json` with `isolationStatus: "validated"` is present. The
template is intentionally marked `not-validated`.

## Current controls

- ZIP inspection and extraction are static operations.
- Archive paths are contained and project-relative imports are checked.
- Imported dependency versions are allowlisted; arbitrary project dependency
  installation is not performed.
- Render outputs must remain inside the selected project `outputs` directory.
- Existing outputs are never overwritten by the Remotion worker.
- Render history is written atomically.
- The Electron service rejects rendering unless the policy is validated,
  network access is explicitly false, and filesystem scope is `project-only`.
- The restricted-token experiment is not used as a security boundary.

## Required unimplemented boundary

The following requirements remain release blockers:

1. A Windows access boundary for project, approved media, runtime, temporary,
   and output directories, with unrelated user data denied.
2. Explicit outbound network denial covering HTTP, HTTPS, raw TCP, DNS, and
   WebSocket attempts.
3. Job Object containment for Node, Chromium, compositor processes, and all
   descendants.
4. CPU, memory, process-count, wall-time, cancellation, and cleanup limits.
5. Independent adversarial verification of filesystem, network, process, and
   escape attempts.

Restricted tokens, working-directory changes, environment variables, and Job
Objects without filesystem/network controls are not sufficient.

## Evidence

| Check | Result | Evidence |
|---|---|---|
| Motion service module syntax | Passed | `node --check src/main/motion-service.js` |
| IPC registration uniqueness | Passed | 25 registered handlers, 25 unique |
| Empty render history | Passed | Handler returned `[]` for absent history |
| Restricted-token sandbox | Not validated | Launcher fails closed and is not wired for rendering |
| Windows filesystem adversarial tests | Not run | No implemented OS boundary to test |
| Windows network adversarial tests | Not run | No implemented OS boundary to test |
| Process/resource containment tests | Not run | No implemented worker boundary to test |
| Production Motion rendering | Blocked | Security policy is absent/unvalidated |

## Release status

**Not production-ready for imported-project rendering.** Do not change the
policy template to validated and do not distribute a partial production
renderer.
