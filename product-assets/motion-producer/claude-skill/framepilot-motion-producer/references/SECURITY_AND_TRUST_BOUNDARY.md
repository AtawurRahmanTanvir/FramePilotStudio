# Security and Trust Boundary

## Static source generation is not safe execution

The Skill writes project source and inspects files. It must not execute untrusted project code, `npm install`, package scripts, native binaries, shell hooks or imported JavaScript while inspecting a project.

## FramePilot's import boundary

Remotion source is executable code. The project ZIP is untrusted until the FramePilot importer and Windows worker boundary approve it. A ZIP validator can find malformed archive paths, unexpected files and obvious source hazards, but it cannot prove a project harmless.

The application must continue to enforce its own security policy:

- OS-enforced project-scoped filesystem access.
- Explicit read-only runtime allowlist.
- Write access only to the project's approved bundle/cache/output area.
- Network denial at the OS boundary.
- Child-process containment and process-tree cleanup.
- CPU/memory/time constraints.
- Restricted handles/environment and controlled executable access.
- Fail-closed behavior when any required control is unavailable.

Do not use this document to bypass an incomplete sandbox. Do not turn a static validator pass into permission to execute a project.

## ZIP checks are defense-in-depth

Reject path traversal, absolute/drive-qualified paths, duplicate names, symlinks, oversized archives, forbidden cache folders, secret files and wrapper-folder manifest placement. Validate package dependency pins and source entry points without executing them.

## Data privacy

- Do not upload the user's media to an unapproved host.
- No analytics, tracking or remote telemetry in generated projects.
- Do not embed usernames, local drive letters, absolute project paths, Windows profile names or environment secrets.
- No remote font or media fetch.
- Keep project files local and explicitly packaged.
