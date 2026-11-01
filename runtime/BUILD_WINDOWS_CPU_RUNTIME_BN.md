# FramePilot Studio — Windows Offline Runtime Build Profile

এই ফাইলটি runtime build specification, installer নয়। WhisperX/PyTorch ও মডেল bundle সত্যিকারের Windows x64 build host-এ তৈরি, hash এবং clean-machine test না হওয়া পর্যন্ত Audio Engine Ready দেখানো যাবে না।

## নির্বাচিত baseline

- OS/architecture: Windows 10/11 x64
- Private Python runtime: CPython 3.12 x64
- WhisperX: `3.8.6` stable (3.8.4 থেকে transcribe/align progress callbacks রয়েছে; 3.8.2-এর timestamp regression এড়াতে 3.8.6 ব্যবহার)
- PyTorch family: `torch==2.8.0`, `torchaudio==2.8.0`, `torchvision==0.23.0` — WhisperX 3.8.6 dependency constraints-এর সঙ্গে মেলে
- Processing target: CPU INT8 default; CUDA profile আলাদা runtime build হিসেবে পরে
- FFmpeg: pinned source commit/build configuration; only required demuxers, decoders, filters and WAV PCM encoder enabled; `ffmpeg.exe` + `ffprobe.exe`
- ASR and alignment model files: local folders only; no online model fallback at runtime

## Build workflow (Windows x64)

1. CPython 3.12 x64 private build environment তৈরি করো।
2. WhisperX 3.8.6 dependency graph resolve করে সম্পূর্ণ lock file এবং wheel hashes সংরক্ষণ করো।
3. CPU PyTorch wheel index থেকে matching torch/torchaudio/torchvision install করো; direct/transitive dependency-র exact version lock করো।
4. `whisperx.load_model(..., local_files_only=True)` এবং manifest-এ ঘোষিত loader অনুযায়ী `whisperx.load_align_model(..., model_dir=<local-cache>, model_cache_only=True)`) smoke-test করো।
5. নির্বাচিত faster-whisper ASR model ও প্রয়োজনীয় ভাষার aligner model runtime/models-এর পৃথক directory-তে রাখো।
6. `runtime/manifests/runtime-manifest.json`-এ প্রতিটি model-এর relative `path`, UI `name`, `label` বা `language`, package versions এবং প্রতিটি shipped binary/model file-এর SHA-256 যোগ করো।
7. PyInstaller one-folder backend build করো, PyTorch/torchaudio native DLL ও model resources অন্তর্ভুক্ত হয়েছে নিশ্চিত করো।
8. Custom FFmpeg build-এর `--version` ও `-buildconf` output, enabled components এবং FFmpeg license notices সংরক্ষণ করো।
9. Internet বন্ধ, Python/FFmpeg/WhisperX system-wide install নেই—এমন clean Windows 11 x64 VM-এ installer test করো।
10. Long audio, silence, number/ordinal words, punctuation, multilingual phrase, missing aligner, corrupted file এবং cancellation test করো।

## Runtime manifest entry shape

```json
{
  "schema_version": 1,
  "product": "FramePilot Studio",
  "status": "release-ready",
  "whisperx": {
    "version": "3.8.6",
    "asr_models": [
      {"name": "medium", "label": "Medium · Offline", "path": "models/asr/medium", "required_files": ["config.json", "model.bin", "tokenizer.json"], "default": true}
    ],
    "alignment_models": [
      {"language": "en", "loader": "torchaudio", "model_name": "WAV2VEC2_ASR_BASE_960H", "path": "models/alignment/en", "required_files": ["wav2vec2_fairseq_base_ls960_asr_ls960.pth"]}
    ]
  }
}
```

`path` runtime root (`resources/runtime/`) relative; path runtime root-এর বাইরে যেতে পারবে না। Runtime একইসঙ্গে ASR model এবং detected voiceover language-এর aligner না পেলে Audio-to-CSV button disabled থাকবে বা clear preflight error দেখাবে। Timestamp কখনো অনুমান করে লেখা যাবে না।

## Upstream references

- WhisperX 3.8.6 PyPI: https://pypi.org/project/whisperx/
- WhisperX 3.8.6 release: https://github.com/m-bain/whisperX/releases/tag/v3.8.6
- WhisperX 3.8.6 dependency declaration: https://github.com/m-bain/whisperX/blob/v3.8.6/pyproject.toml
- PyTorch install selector: https://pytorch.org/get-started/locally/
