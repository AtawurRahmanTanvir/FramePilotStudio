# Motion Runtime Distribution

The Node.js and Chrome Headless Shell payloads are intentionally not stored in the
Git source repository. The local application may still contain them under
`runtime/motion/node/` and `runtime/motion/browser/`; those directories are ignored
so production builds include them when they are available locally.

## Install or verify

From the repository root on Windows:

```powershell
npm run install:motion-runtime
```

The installer downloads the pinned official Windows x64 archives, obtains the
official Node checksum list, verifies SHA-256 before extraction, verifies the
installed executables again, and preserves the Chrome license file. It does not
install packages from npm and does not alter Filmora runtime files.

To verify an existing local payload without downloading:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/INSTALL_MOTION_RUNTIME.ps1 -VerifyOnly
```

The small [`runtime-manifest.json`](./runtime-manifest.json) records the exact
versions, official URLs, executable hashes, Remotion version, and installer path.
`npm run preflight` still checks the complete runtime and fails closed when any
required artifact or security policy is missing.

## Packaging

`electron-builder` includes `runtime/motion/**` when the locally installed runtime
is present. A source checkout without the ignored payload remains buildable as a
development/source package, but it must not be presented as an offline production
runtime until installation and preflight succeed.
