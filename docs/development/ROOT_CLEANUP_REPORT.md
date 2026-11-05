# Root Cleanup Report

Date: 2026-11-05

## Completed safely

- Established `product-assets/motion-producer/` as the sole active first-party
  Motion Producer resource tree.
- Archived the superseded overlay, historical upstream Skill copy and original
  staging tree under `backups/2026-11-05-first-party-producer-cleanup/`.
- Removed the obsolete overlay resource packaging entry.
- Added targeted Git ignores for Remotion bundle caches and temporary render
  artifacts.
- Kept build-critical root configuration and the existing runtime directories
  in place.

## Preserved

- Existing Filmora source and workflow files.
- Runtime binaries, native DLLs and model payloads.
- Existing release output and historical backups.
- Existing user data outside the repository.

## Not moved

Large runtime payloads remain under `runtime/` because application packaging
and runtime resolution depend on those paths. Generated release output remains
under `release/` because Electron Builder is configured to write there.
