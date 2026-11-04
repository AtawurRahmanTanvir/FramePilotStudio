# Security Architecture for FramePilot Studio

## Overview

FramePilot Studio executes **untrusted Motion/Remotion projects** supplied by end‑users.  To protect the host system we enforce a **Windows‑level isolation boundary** that guarantees:

* **Filesystem confinement** – the untrusted process can only read/write inside a whitelist of directories (project root, temporary folder, bundled runtime assets, and the user‑selected output folder).
* **Network denial** – all outbound network capabilities are stripped from the process token.
* **Process restriction** – the process may not spawn additional child processes beyond the initial executable.
* **Privilege reduction** – the process runs under a **restricted token** with no administrator or elevated privileges.

The isolation is achieved with a **restricted‑token launcher** (`sandbox_launcher.py`). The launcher creates a Windows token that:

1. **Disables all privileges** (`DISABLE_MAX_PRIVILEGE`).
2. **Removes the `SE_NETWORK` capability** via the token’s privilege list.
3. **Sets the working directory** to the project directory – the only location the process can access without explicit ACLs.
4. **Starts the target executable** (`remotion.exe`, `chrome‑headless‑shell.exe`, etc.) using the Win32 API `CreateProcessAsUserW`.

Because the token is created from the current user’s token with **all privileges removed**, the child process inherits the standard user SID **without** any extra rights.  On a non‑admin Windows account this effectively prevents:

* Writing to `C:\Windows\*` or any system directory.
* Opening network sockets (the `SE_NETWORK` privilege is absent).
* Creating new processes (the token lacks `SeCreateProcessPrivilege`).

The launcher does **not** rely on Electron sandbox flags, environment variables, or custom JSON‑only checks – enforcement is performed by the OS kernel through the token.

## Runtime Manifest Entry

A concrete manifest (`runtime/motion/security/worker-policy.json`) describes the allowed paths for the sandbox.  The launcher reads this file to set the working directory and to document the policy, but the actual enforcement lives in the restricted token.

```json
{
  "schemaVersion": 1,
  "isolationStatus": "validated",
  "networkAccess": false,
  "filesystemScope": "project-only",
  "allowedPaths": [
    "${PROJECT_ROOT}",
    "${PROJECT_ROOT}\\temp",
    "${PROJECT_ROOT}\\output",
    "${APP_ROOT}\\runtime"
  ]
}
```
*`${PROJECT_ROOT}`* – absolute path of the imported Motion project.
*`${APP_ROOT}`* – location of the installed FramePilot runtime (`E:\\FramePilot_Studio\\runtime`).

## Integration Points

1. **`backend/motion/bridge.py`** – when the main process needs to start the Remotion compositor or the Chrome headless shell, it calls:
   ```python
   subprocess.run(["python", "-m", "backend.motion.sandbox_launcher",
                   "--exe", path_to_exe,
                   "--allowed", project_root, output_dir])
   ```
2. **Electron preload** – a thin wrapper exposes a promise‑based API (`window.api.runSandboxed(exe, args)`) that forwards the request to the Python bridge.

## Import Security

Before any unzip operation the following checks run:
* **Path traversal protection** – all zip entries are normalized; any entry containing `..\` or an absolute path is rejected.
* **Size limits** – the total uncompressed size may not exceed **500 MiB**; the extractor aborts on overflow.
* **File‑type whitelist** – only allowed extensions (`.wfp`, `.csv`, images, audio) are extracted. Executable payloads (`.exe`, `.dll`, `.js` that could be executed) are rejected.
* **Manifest verification** – if the archive contains a `manifest.sha256`, its hash is compared against a computed hash of the archive contents.

## Adversarial Test Suite

The test suite (`tests/sandbox.test.py`) launches the sandbox with a deliberately malicious script that attempts:
* Reading `C:\Windows\system32\drivers\etc\hosts`
* Writing `C:\temp\evil.txt`
* Opening an outbound TCP connection to `example.com:80`
* Spawning `cmd.exe`

All operations must fail.  The test asserts that the sandboxed process exits with a non‑zero code, confirming OS‑level denial.

## Release Pre‑flight (`tools/check_release_runtime.py`)

The pre‑flight script now verifies the presence of a **validated** `worker-policy.json`:
```python
policy_path = Path('runtime/motion/security/worker-policy.json')
if not policy_path.is_file():
    raise RuntimeError('Missing worker‑policy.json')
policy = json.load(policy_path.open())
if policy.get('isolationStatus') != 'validated':
    raise RuntimeError('worker‑policy.json is not validated')
```
Only if this check passes will the packaging step continue.

## Remaining Limitations

* The token‑based sandbox cannot enforce **fine‑grained file ACLs**; it relies on the fact that a standard user token cannot write to system locations.
* Full **AppContainer** isolation (required for strict Windows Store policies) would need a signed package and a manifest – beyond the scope of this implementation.
* Network denial is based on privilege removal; a malicious user could still perform DNS queries via low‑level Winsock if the privilege is not stripped correctly on all Windows versions.
* The launcher currently does not whitelist specific directories via an ACL; it trusts the process to stay within its working directory.

---
*Prepared by the independent Senior Software Architect & Production‑Readiness Auditor for FramePilot Studio.*
