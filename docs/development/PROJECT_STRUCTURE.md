# Project Structure

## Canonical source layout

- `src/` — Electron main, preload and renderer source.
- `backend/motion/` — Motion validation and Word Timing backend.
- `runtime/motion/` — pinned local Remotion worker contract and installed runtime
  payloads; large binaries remain locally installed and ignored.
- `product-assets/motion-producer/` — the single first-party Skill source,
  project instructions, schemas, templates, validators, examples, tests and
  reproducible Skill ZIP.
- `tools/` — application build and runtime utilities.
- `tests/` — existing application regression tests.
- `docs/` — maintained product and development documentation.
- `release/` — generated packaging output, ignored by Git.
- `backups/` — preserved historical work and recovery snapshots.

## Root configuration retained

`package.json`, `package-lock.json`, `README.md`, `.gitignore`,
`.gitattributes` and licensing/notice files remain at the repository root
because npm, Electron Builder, Git and licensing workflows expect them there.

## Resource resolution

Development resolves first-party resources from the repository root. Packaged
Electron builds resolve them from `process.resourcesPath`. The renderer only
uses narrow preload IPC methods and never receives a developer-only absolute
path.
