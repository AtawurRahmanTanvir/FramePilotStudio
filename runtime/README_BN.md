# Local Runtime Bundle — Release Build Inputs

FramePilot Studio-এর installer-এ Python backend, WhisperX, PyTorch/torchaudio, FFmpeg/FFprobe এবং সব প্রয়োজনীয় ASR/aligner model application-private runtime হিসেবে bundle করতে হবে। ব্যবহারকারীকে এগুলো আলাদাভাবে install বা PATH configure করতে হবে না।

## Target layout

```text
runtime/
  backend/FramePilotBackend/
    FramePilotBackend.exe
    _internal/ ... (Python, WhisperX, PyTorch, VAD model asset, native DLLs)
  ffmpeg/
    ffmpeg.exe
    ffprobe.exe
  models/
    asr/<model-files>/
    alignment/<language>/<aligner-files>/
  manifests/
    runtime-manifest.json
```

## Model requirements

- Runtime manifest-এর `required_files` প্রতিটি ASR/aligner entry-তে আবশ্যক; শুধু directory থাকলেই engine-ready হবে না।
- ASR: Faster-Whisper local model files (`config.json`, `model.bin`, `tokenizer.json` সহ) bundle করতে হবে।
- Word alignment: detected language অনুযায়ী local aligner দরকার। প্রথম runtime profile-এ English (`en`) aligner।
- Torchaudio English aligner-এর `wav2vec2_fairseq_base_ls960_asr_ls960.pth` checkpoint সরাসরি `models/alignment/en/` directory-তে থাকতে হবে, `checkpoints/` subfolder-এ নয়।
- WhisperX 3.8.6-এর default Pyannote VAD path package-এর `whisperx/assets/pytorch_model.bin` ব্যবহার করে। PyInstaller spec-এ `collect_all('whisperx')` দিয়ে এই asset এবং related package data অন্তর্ভুক্ত করতে হবে; runtime check এই file আলাদাভাবে যাচাই করে।
- `HF_HUB_OFFLINE=1` এবং `TRANSFORMERS_OFFLINE=1` processing-এ enforce করা হয়। Missing model থাকলে network download করা হবে না।
- Python / WhisperX native dependencies, PyTorch, torchaudio, TorchCodec, CTranslate2 এবং Windows DLL একসঙ্গে pin ও smoke-test করতে হবে।

## Build workflow

1. Windows 10/11 x64 build host-এ CPython 3.12 venv তৈরি করো।
2. `torch==2.8.0`, `torchaudio==2.8.0`, `torchvision==0.23.0` CPU wheels install করো।
3. `whisperx==3.8.6` ও PyInstaller 6.15.0 install করে resolved `pip freeze` lock সংরক্ষণ করো।
4. নির্বাচিত Faster-Whisper ASR model repository snapshot commit record করে local model directory-তে download করো।
5. English Torchaudio aligner checkpoint direct model directory-তে download করে SHA-256 verify করো।
6. FFmpeg/FFprobe Windows binary stage করো; `-version`, `-buildconf`, SHA-256 এবং redistribution license evidence সংরক্ষণ করো।
7. `FramePilotBackend.spec` দিয়ে one-folder frozen backend তৈরি করো; WhisperX package data (VAD asset), PyTorch/torchaudio/TorchCodec/CTranslate2 native DLL এবং hidden imports validate করো।
8. Runtime manifest-এ version, model commit, required files, file SHA-256, FFmpeg configuration ও license status লিখো।
9. frozen backend `runtime-info` self-check এবং clean offline Windows VM test চালাও।
10. third-party audit, code signing, install/update/rollback, voiceover regression এবং Filmora 15 project open/playback test শেষ না হওয়া পর্যন্ত manifest `status` `incomplete` রাখো।

## Release policy

`npm run preflight` ইচ্ছাকৃতভাবে incomplete runtime-কে block করবে। কোনো model বা binary missing থাকলে UI Audio Engine disabled থাকবে; placeholder timestamp বা cloud fallback ব্যবহার হবে না।
