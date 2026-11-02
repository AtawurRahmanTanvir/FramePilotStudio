# Third-party notices

**RELEASE AUDIT STATUS: BLOCKED.** The evidence below records the locally verified components and the remaining legal/redistribution blockers. It is not a legal opinion or a declaration of compliance.

FramePilot Studio is not the author of the third-party engines, packages, model weights, or media binaries listed below. Preserve the upstream licenses and notices with any redistribution. This register records the evidence available in this repository; unresolved items remain release blockers.

## Components inspected for this integration

| Component | Version/build | License or status | Preserved notice / source |
|---|---|---|---|
| WhisperX | 3.8.6 | BSD 2-Clause | `vendor/whisperx-source/LICENSE`; [upstream](https://github.com/m-bain/whisperX) |
| FFmpeg and FFprobe | BtbN `n9.0.2-42-gd7643a0fe3-20261101`, x86_64 LGPL archive | Pinned `win64-lgpl-9.0` archive; published configuration has no GPL/nonfree/x264/x265/xvid flags. Corresponding-source and redistribution review remain open. | `vendor/ffmpeg/LICENSE`, `vendor/ffmpeg/README.txt`; [FFmpeg legal](https://ffmpeg.org/legal.html), [BtbN builds](https://github.com/BtbN/FFmpeg-Builds/releases) |
| faster-whisper medium model | `Systran/faster-whisper-medium`, revision `08e178d48790749d25932bbc082711ddcfdfbc4f` | MIT according to the model card | [model card](https://huggingface.co/Systran/faster-whisper-medium/tree/main) |
| pyannote segmentation VAD | `pyannote/segmentation-3.0` | MIT model license; gated Hugging Face access terms also apply to model acquisition | [model card](https://huggingface.co/pyannote/segmentation-3.0/tree/main) |
| English torchaudio aligner | `WAV2VEC2_ASR_BASE_960H` | MIT, per the upstream model documentation | [torchaudio documentation](https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html) |
| Python dependencies | 118 locked entries in `runtime/manifests/python-requirements-lock.txt` | Package versions are pinned. The lock is not, by itself, a redistribution license grant; individual notices and transitive obligations still require legal review. | `runtime/manifests/python-requirements-lock.txt`; Python Packaging User Guide [licensing](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/#license) |
| Electron | 45.2.1 | Electron license notice is present in `node_modules/electron/LICENSE`; Chromium notices are present in `node_modules/electron/dist/LICENSES.chromium.html`. The final redistribution package must preserve those notices. | Local Electron package; [Electron licenses](https://www.electronjs.org/docs/latest/tutorial/licenses) |
| electron-builder | 26.18.0 | MIT notice is present in `node_modules/electron-builder/LICENSE`. It is a build-time dependency, not intentionally shipped as application runtime code. | Local package; [electron-builder](https://github.com/electron-userland/electron-builder) |
| npm dependency tree | 283 locked package entries in `package-lock.json` | All lock entries contain license metadata, but metadata is not a substitute for collecting and shipping required license texts. | `package-lock.json`; [npm package-json license field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#license) |
| Legacy Filmora automation | Project-owned legacy integration copied into the backend | No independent third-party license evidence was found for the legacy source or its external automation assumptions. Redistribution and dependency review remain blocked. | `backend/legacy_filmora_engine.py`; project history/ownership evidence required |

## Verification evidence

- The frozen runtime inventory contains 20,145 shipped files. Every non-manifest, non-placeholder file under `runtime/` has exactly one inventory record, and all recorded sizes and SHA-256 values match the files currently on disk and in the unpacked Electron package.
- The staged FFmpeg README identifies the pinned BtbN archive, x86_64 architecture, archive SHA-256, FFmpeg source reference, and LGPL notice. The binary was replaced only after verifying its version, architecture, and published non-GPL configuration.
- `package-lock.json` contains license metadata for all 283 locked npm package entries. This is metadata evidence only; it does not replace review of each license notice and Electron/Chromium/Node redistribution materials.
- The project-owned WhisperX copy preserves its BSD-2-Clause license in `vendor/whisperx-source/LICENSE`. The ASR, VAD, and alignment model references and hashes are recorded in `runtime/manifests/runtime-manifest.json`.
- The exact Store-facing metadata currently available is `appId: studio.framepilot.desktop` and author `FramePilot Studio`. No Store-reserved identity name, publisher subject, certificate, or Partner Center authorization is present in the repository.

## Explicit unresolved blockers

- The selected FFmpeg binary is an LGPL build, but the repository does not yet contain a verified corresponding-source package or legal approval for redistribution of this exact build. The prior GPL build is no longer staged.
- The complete license texts and attribution notices for every frozen Python dependency, npm dependency, Electron/Chromium/Node component, and legacy Filmora automation dependency have not been independently collected and reviewed.
- The `pyannote/segmentation-3.0` model requires accepting Hugging Face user conditions and using an access token for acquisition. The repository has no evidence that those conditions authorize bundling the checkpoint in a Store submission.
- The faster-whisper model page points to the original OpenAI Whisper model card; the original model terms and redistribution rights must be reviewed together with the converted CTranslate2 files.
- The torchaudio alignment checkpoint is referenced as MIT by upstream documentation, but the exact downloaded artifact's provenance and redistribution notice are not bundled separately.

## Compliant alternatives requiring approval and revalidation

- Complete the corresponding-source and legal review for the pinned BtbN LGPL build, then rerun the full media compatibility and runtime tests before treating the FFmpeg blocker as resolved.
- Keep the pyannote VAD checkpoint as a separately acquired user asset, or select a replacement VAD model whose license explicitly permits application redistribution. A replacement must be validated against the existing WhisperX API and must not be substituted silently.
- Keep the medium ASR and alignment assets bundled only after their upstream terms are confirmed for redistribution. Otherwise, provide an approved acquisition workflow that preserves offline operation after acquisition; this requires a product decision and must not introduce an undocumented runtime download.
- Generate and ship the complete license/notice bundle for the 118 Python entries and 283 npm entries after a package-by-package review. Automated license metadata can identify scope but cannot make the legal determination.

## Microsoft Store packaging evidence

Microsoft's current documentation identifies MSIX as the modern package format and requires a valid package manifest, identity, publisher metadata, architecture-specific package, Store assets, and Windows App Certification Kit validation. Store MSIX submissions may be re-signed by Microsoft; an MSI or EXE submission must be Authenticode-signed by the publisher.

The current repository cannot produce a verified Store submission package because:

- `package.json` has no `msix` target, Store identity name, publisher subject, or Store-specific asset set.
- No Store-reserved identity or publisher certificate subject was supplied.
- `makeappx.exe`, `makepri.exe`, and `signtool.exe` are not available in the current environment.
- No `.msix`, `.msixbundle`, or `.msixupload` artifact exists.

Authoritative packaging references:

- [Microsoft Electron MSIX packaging](https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/electron-packaging)
- [Microsoft MSIX package requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- [Microsoft Store publishing overview](https://learn.microsoft.com/en-us/windows/apps/publish/)
- [electron-builder MSIX target](https://www.electron.build/docs/msix/)

## Remaining release review

- Complete a license and attribution inventory for every locked Python and npm dependency, Electron/Chromium/Node, and the legacy Filmora Automation Studio v0.2.0 code.
- Review the exact FFmpeg build's enabled libraries, GPL/version-3 flags, source/build corresponding obligations, and required distribution materials before shipping the binaries.
- Confirm redistribution rights and any acquisition terms for each model. Do not treat a model card label alone as proof of permission for every distribution context.
- Include any required license texts and notices in the final packaged application and installer.

Do not remove upstream copyright/license notices or represent WhisperX, PyTorch, FFmpeg, model weights, or other third-party components as original FramePilot code.
