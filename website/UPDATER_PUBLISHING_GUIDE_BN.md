# FramePilot Studio — Official Website Update Channel

The Windows application reads update information only from the official website:

- `https://framepilotstudio.github.io/updates/manifest.json`
- `https://framepilotstudio.github.io/updates/versions.json`

GitHub Pages is the single catalogue/download entry point. Installer binaries may be hosted as GitHub Release assets, but the application discovers those URLs only through the official website catalogue.

## Release manifest

When a public release is approved, set `manifest.json` to:

```json
{
  "schema_version": 1,
  "product": "FramePilot Studio",
  "status": "published",
  "channel": "stable",
  "latest_version": "0.1.1",
  "download_page": "https://framepilotstudio.github.io/download/",
  "updated_at": "2026-11-01T00:00:00Z"
}
```

## Version catalogue

`versions.json` must be a JSON array sorted however the website prefers; the application sorts it semantically. Each release requires a Windows installer URL and its SHA-256 checksum:

```json
[
  {
    "version": "0.1.1",
    "name": "FramePilot Studio 0.1.1",
    "published_at": "2026-11-01T00:00:00Z",
    "channel": "stable",
    "notes": "Initial public release.",
    "notes_url": "https://framepilotstudio.github.io/changelog/0.1.1/",
    "installer": {
      "platform": "win-x64",
      "url": "https://github.com/FramePilotStudio/FramePilotStudio/releases/download/v0.1.1/FramePilot-Studio-Setup-0.1.1.exe",
      "sha256": "REPLACE_WITH_64_HEX_SHA256",
      "publisher_thumbprint": "REPLACE_WITH_APPROVED_WINDOWS_CERTIFICATE_THUMBPRINT"
    }
  }
]
```

Do not publish a version until its installer exists, passes a clean Windows installation test, and its SHA-256 value has been computed from the final installer file, and it is signed with the approved publisher certificate. Publish the certificate thumbprint alongside the checksum. For a release with multiple platforms, add one release entry per version and extend the platform selector before offering the other platform.

## Update behaviour

- Startup: check the official manifest; when a newer release is available, automatically download it if the user has enabled automatic downloads.
- Installation: never silently replace the application; show the verified installer and ask the user to approve installation/restart.
- Manual: `Check for Updates` checks the latest stable release.
- Version history: `Check All Versions` displays every entry in `versions.json`; selecting a version downloads its installer and permits switching/downgrading after checksum verification.
- Safety: HTTPS only; approved download hosts only; SHA-256 required; Windows Authenticode signature must be valid and the signer thumbprint must match the publisher fingerprint published in the official catalogue. Any mismatch blocks installation.

## Website deployment

Copy the `updates/` folder to the root of the GitHub Pages site so the public URLs above resolve. Keep `/download/` as the user-facing download page. The site repository and release repository must be created/configured in the FramePilotStudio organization before public release. Do not use a draft or unverified setup file in `versions.json`.
