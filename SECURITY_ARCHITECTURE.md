# Motion Worker Security Status

## Current status: blocked and not validated

Motion projects contain executable JavaScript/TypeScript. The current application
does **not** yet provide a complete Windows security boundary for imported project
execution. Motion rendering therefore remains disabled unless a separately
implemented and independently tested boundary is approved.

The following mechanisms are useful hardening layers but are **not** project-only
isolation on their own:

- Electron renderer sandboxing.
- A restricted token with removed privileges.
- A working-directory change.
- Environment variables or a JSON policy file.
- A Windows Job Object without filesystem and network controls.

In particular, `backend/motion/sandbox_launcher.py` currently provides only a
best-effort restricted-token launcher. It does not apply an ACL that confines
file reads/writes, does not deny outbound network traffic, and is not wired into
the Remotion worker launch path. It must not be described as a validated
sandbox.

## Required boundary before enabling rendering

The implementation must combine and verify, on Windows x64:

1. A real filesystem boundary, such as an AppContainer capability model or
   explicit deny-by-default ACLs applied to a dedicated worker identity and
   project/output directories.
2. Explicit outbound network denial, tested against external addresses and a
   local listener.
3. A Job Object containing Node, Chromium, compositor and all descendants.
4. CPU, memory, process-count and wall-time limits with deterministic cleanup.
5. Denial of reads from user profiles, secrets, sibling projects and startup
   locations.
6. Denial of arbitrary process creation or containment of all child processes.
7. Adversarial tests proving each denial and escape attempt.

Only after those tests pass may a generated
`runtime/motion/security/worker-policy.json` use
`isolationStatus: "validated"`. The template is documentation only.

## Import boundary

Motion ZIP inspection and extraction remain static operations. Project code is
not executed during inspection or import. Dependency versions are checked
against the repository allowlist, local source imports must resolve within the
archive, and extraction paths are contained within the Motion Projects folder.

## Current release decision

Keep rendering disabled. Do not claim filesystem confinement, network denial,
process isolation, AppContainer enforcement, or production-ready Motion
rendering until the independent Windows adversarial test suite exists and passes.
