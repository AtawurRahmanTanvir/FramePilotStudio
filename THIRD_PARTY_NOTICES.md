# Third-party notices

**RELEASE AUDIT STATUS: BLOCKED.** The complete dependency license inventory and FFmpeg redistribution review are not finished.

FramePilot Studio is not the author of the third-party engines, packages, model weights, or media binaries listed below. Preserve the upstream licenses and notices with any redistribution. This is a preliminary attribution record, not a completed distribution compliance review.

## Components inspected for this integration

| Component | Version/build | License or status | Preserved notice / source |
|---|---|---|---|
| WhisperX | 3.8.6 | BSD 2-Clause | `vendor/whisperx-source/LICENSE`; [upstream](https://github.com/m-bain/whisperX) |
| FFmpeg and FFprobe | 9.0.2 Gyan full static build | README identifies GPL v3; configure has `--enable-gpl --enable-version3`. Distribution is blocked pending GPL/source obligations review. | `vendor/ffmpeg/LICENSE`, `vendor/ffmpeg/README.txt`; [FFmpeg legal](https://ffmpeg.org/legal.html), [Gyan builds](https://www.gyan.dev/ffmpeg/builds/) |
| faster-whisper medium model | `Systran/faster-whisper-medium`, revision `08e178d48790749d25932bbc082711ddcfdfbc4f` | MIT according to the model card | [model card](https://huggingface.co/Systran/faster-whisper-medium/tree/main) |
| pyannote segmentation VAD | `pyannote/segmentation-3.0` | MIT model license; gated Hugging Face access terms also apply to model acquisition | [model card](https://huggingface.co/pyannote/segmentation-3.0/tree/main) |
| English torchaudio aligner | `WAV2VEC2_ASR_BASE_960H` | MIT, per the upstream model documentation | [torchaudio documentation](https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html) |
| Python dependencies | See `runtime/manifests/python-requirements-lock.txt` | Exact installed versions are pinned; the individual license texts for all direct and transitive dependencies still require a complete audit. | Reference `pip freeze --all`; no package was installed or changed in the original environment. |

## Remaining release review

- Complete a license and attribution inventory for every locked Python and npm dependency, Electron/Chromium/Node, and the legacy Filmora Automation Studio v0.2.0 code.
- Review the exact FFmpeg build's enabled libraries, GPL/version-3 flags, source/build corresponding obligations, and required distribution materials before shipping the binaries.
- Confirm redistribution rights and any acquisition terms for each model. Do not treat a model card label alone as proof of permission for every distribution context.
- Include any required license texts and notices in the final packaged application and installer.

Do not remove upstream copyright/license notices or represent WhisperX, PyTorch, FFmpeg, model weights, or other third-party components as original FramePilot code.
