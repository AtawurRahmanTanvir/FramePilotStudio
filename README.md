# FramePilot Studio

Local-first video production workflow with Script-to-Image planning and Filmora automation.

## Requirements

- Windows 10/11 x64
- Node.js and npm
- CPython 3.12 x64
- PowerShell
- Git
- Project-compatible FFmpeg Windows x64 distribution

## Restore from GitHub ZIP

1. Download and extract the repository ZIP.
2. Open PowerShell in the extracted project folder.
3. Install Node dependencies:

   npm ci

4. Stage the required FFmpeg files in:

   vendor/ffmpeg/

   Required files:
   - ffmpeg.exe
   - ffprobe.exe
   - LICENSE
   - README.txt

5. Build the offline runtime:

   npm run build:offline-runtime

6. Validate the runtime:

   npm run preflight

7. Run the tests:

   npm test

8. Build the Microsoft Store package:

   npm run dist

## Important Runtime Notes

Generated runtime files are intentionally excluded from Git:

- runtime/backend/
- runtime/models/
- runtime/ffmpeg/*.exe
- dist/
- release/

The offline runtime build script recreates the backend and downloads/verifies the pinned model assets. FFmpeg must be staged separately as described above.

A source ZIP is not a ready-to-run offline installer. Complete the runtime build and preflight before creating a release.

## Microsoft Store

The Windows release target is APPX x64. Store identity and publisher configuration are maintained in package.json.

## License

See THIRD_PARTY_NOTICES.md and the individual third-party license files before redistribution.
