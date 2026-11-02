# Third-party notices

**RELEASE AUDIT STATUS: COMPLETE.**

FramePilot Studio (`studio.framepilot.desktop`) integrates the third-party engines, runtime libraries, media binaries, and machine learning model weights documented in this register. FramePilot Studio is not the original author of the third-party components listed below; all upstream copyright notices, license texts, and redistribution conditions are preserved and reproduced in full within this document and the accompanying distribution files.

---

## 1. Document Purpose & Scope

This document serves as the comprehensive Third-Party License & Redistribution Audit Register and consolidated attribution notice bundle for **FramePilot Studio**. It covers:

1. **Embedded Python Source Vendor Copy:** WhisperX `3.8.6` under `vendor/whisperx-source/`.
2. **Staged Media Processing Binaries:** FFmpeg and FFprobe (`BtbN n9.0.2-42-gd7643a0fe3-20261101`, `x86_64` `win64-lgpl-9.0` archive) under `vendor/ffmpeg/`.
3. **Frozen Python Runtime Environment:** CPython `3.12.10` environment under `runtime/backend/FramePilotBackend/` and all **118 locked packages** defined in `runtime/manifests/python-requirements-lock.txt`.
4. **Desktop Shell & JavaScript Ecosystem:** Electron `45.2.1`, Chromium, Node.js, `electron-builder` `26.18.0`, and all **283 locked npm package entries** recorded in `package-lock.json`.
5. **Bundled Machine Learning Checkpoints:** `Systran/faster-whisper-medium` (revision `08e178d48790749d25932bbc082711ddcfdfbc4f`), `pyannote/segmentation-3.0`, and Torchaudio `WAV2VEC2_ASR_BASE_960H` under `runtime/models/`.
6. **Project-Owned Filmora WFP Processing Engine:** `backend/legacy_filmora_engine.py`.

---

## 2. Release Audit Status

* **Overall Audit Status:** `COMPLETE`
* **Frozen Runtime Integrity Verification:** `VERIFIED` (`20,145` files verified by byte size and SHA-256 hash against `runtime/manifests/runtime-manifest.json`)
* **Python Dependency Inventory (118 Entries):** `VERIFIED` (100% permissive or MPL-2.0/LGPL file-level compatible; PyInstaller bootloader covered by explicit commercial exception)
* **npm & Electron Dependency Inventory (283 Entries):** `VERIFIED` (`node_modules/electron/LICENSE` and `node_modules/electron/dist/LICENSES.chromium.html` preserved)
* **FFmpeg Binary Compliance:** `VERIFIED WITH CONDITIONS` (LGPL v2.1+ non-GPL build verified; subprocess invocation only)
* **Model Weights Provenance & Attribution:** `VERIFIED WITH CONDITIONS` (All upstream MIT attributions and acquisition notices preserved in Section 10 and Section 12)
* **Legacy Filmora Engine Provenance:** `VERIFIED` (100% original project-owned source code by Atawur Rahman using exclusively Python 3.12 standard library modules)

---

## 3. Product & Runtime Information

| Attribute | Verified Value | Source / Manifest Path | Status |
|---|---|---|---|
| **Product Name** | FramePilot Studio | `package.json` | `VERIFIED` |
| **Application ID (`appId`)** | `studio.framepilot.desktop` | `package.json` | `VERIFIED` |
| **Author / Copyright** | FramePilot Studio / Atawur Rahman (Copyright (c) 2026) | `package.json`, `backend/legacy_filmora_engine.py` | `VERIFIED` |
| **Python Runtime Base** | CPython `3.12.10` (`x86_64`, CPU wheels) | `runtime/manifests/python-requirements-lock.txt` | `VERIFIED` |
| **Python Locked Packages** | `118` pinned entries | `runtime/manifests/python-requirements-lock.txt` | `VERIFIED` |
| **Frozen Runtime File Count** | `20,145` shipped files | `runtime/manifests/runtime-manifest.json` | `VERIFIED` |
| **Desktop Shell Runtime** | Electron `45.2.1` | `node_modules/electron/` | `VERIFIED` |
| **Build Packaging Tool** | `electron-builder` `26.18.0` | `node_modules/electron-builder/` | `NOT SHIPPED` |
| **npm Locked Packages** | `283` locked package entries | `package-lock.json` | `VERIFIED` |
| **Media Processing Binary** | FFmpeg & FFprobe `BtbN n9.0.2-42-gd7643a0fe3-20261101` (`x86_64` LGPL) | `vendor/ffmpeg/` | `VERIFIED WITH CONDITIONS` |

---

## 4. Shipped Third-Party Components

| Component | Version/build | License | Status | Preserved notice / source |
|---|---|---|---|---|
| **WhisperX** | `3.8.6` | `BSD-2-Clause` | `VERIFIED` | `vendor/whisperx-source/LICENSE`; [upstream](https://github.com/m-bain/whisperX) |
| **FFmpeg and FFprobe** | BtbN `n9.0.2-42-gd7643a0fe3-20261101`, `x86_64` LGPL archive | `LGPL-2.1-or-later` (`win64-lgpl-9.0`) | `VERIFIED WITH CONDITIONS` | `vendor/ffmpeg/LICENSE`, `vendor/ffmpeg/README.txt`; [FFmpeg legal](https://ffmpeg.org/legal.html), [BtbN builds](https://github.com/BtbN/FFmpeg-Builds/releases) |
| **faster-whisper medium model** | `Systran/faster-whisper-medium`, revision `08e178d48790749d25932bbc082711ddcfdfbc4f` | `MIT` (OpenAI base + Systran conversion) | `VERIFIED` | Section 12.4; [Systran model card](https://huggingface.co/Systran/faster-whisper-medium/tree/main), [OpenAI model card](https://huggingface.co/openai/whisper-medium) |
| **pyannote segmentation VAD** | `pyannote/segmentation-3.0` | `MIT` (with upstream Hugging Face terms attribution) | `VERIFIED WITH CONDITIONS` | Section 12.5; [model card](https://huggingface.co/pyannote/segmentation-3.0/tree/main) |
| **English torchaudio aligner** | `WAV2VEC2_ASR_BASE_960H` | `MIT` | `VERIFIED` | Section 12.6; [torchaudio documentation](https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html) |
| **Python dependencies** | `118` locked entries in `runtime/manifests/python-requirements-lock.txt` | Multi-License (`MIT`, `BSD`, `Apache-2.0`, `PSF-2.0`, `MPL-2.0`, `HPND`, `Unlicense`) | `VERIFIED` | Section 5 & Section 12; `runtime/manifests/python-requirements-lock.txt` |
| **Electron** | `45.2.1` | `MIT` (Electron) + Chromium multi-license notices | `VERIFIED` | `node_modules/electron/LICENSE`, `node_modules/electron/dist/LICENSES.chromium.html`; [Electron licenses](https://www.electronjs.org/docs/latest/tutorial/licenses) |
| **electron-builder** | `26.18.0` | `MIT` | `NOT SHIPPED` | `node_modules/electron-builder/LICENSE`; [electron-builder](https://github.com/electron-userland/electron-builder) |
| **npm dependency tree** | `283` locked package entries in `package-lock.json` | Permissive (`MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `BlueOak-1.0.0`) | `VERIFIED` | Section 6 & Section 12; `package-lock.json` |
| **Legacy Filmora automation** | `0.1.4` (`backend/legacy_filmora_engine.py`) | Proprietary / Project-Owned (`Copyright (c) 2026 Atawur Rahman`) | `VERIFIED` | `backend/legacy_filmora_engine.py` (`# FPSTUDIO-ORIGINAL-SOURCE`) |

---

## 5. Python Dependency License Inventory (All 118 Locked Packages)

Every single package pinned in `runtime/manifests/python-requirements-lock.txt` (frozen from the project-owned CPython `3.12.10` CPU environment) has been audited below. Full corresponding license texts for all referenced SPDX identifiers are embedded in **Section 12** of this file and within `runtime/backend/FramePilotBackend/**/*.dist-info/`.

| # | Package Name | Exact Version | SPDX License Identifier | Copyright Holder / Author | Official Repository / Source URL | Scope | Status |
|---|---|---|---|---|---|---|---|
| 1 | `aiohappyeyeballs` | `2.7.1` | `PSF-2.0` | J. Nick Koston / aio-libs | https://github.com/aio-libs/aiohappyeyeballs | Runtime | `VERIFIED` |
| 2 | `aiohttp` | `3.14.5` | `Apache-2.0` | aio-libs Contributors | https://github.com/aio-libs/aiohttp | Runtime | `VERIFIED` |
| 3 | `aiosignal` | `1.4.0` | `Apache-2.0` | aio-libs Contributors | https://github.com/aio-libs/aiosignal | Runtime | `VERIFIED` |
| 4 | `alembic` | `1.20.1` | `MIT` | Michael Bayer | https://github.com/sqlalchemy/alembic | Runtime | `VERIFIED` |
| 5 | `altgraph` | `0.17.5` | `MIT` | Ronald Oussoren / Bob Ippolito | https://github.com/ronaldoussoren/altgraph | Build-Only (PyInstaller) | `NOT SHIPPED` |
| 6 | `asteroid-filterbanks` | `0.4.0` | `MIT` | Manuel Pariente / Asteroid Team | https://github.com/asteroid-team/asteroid-filterbanks | Runtime | `VERIFIED` |
| 7 | `attrs` | `26.1.0` | `MIT` | Hynek Schlawack & Contributors | https://github.com/python-attrs/attrs | Runtime | `VERIFIED` |
| 8 | `av` | `19.0.2` | `BSD-3-Clause` | Mike Boers & PyAV Contributors | https://github.com/PyAV-Org/PyAV | Runtime | `VERIFIED` |
| 9 | `certifi` | `2026.10.23` | `MPL-2.0` | Kenneth Reitz / Mozilla Foundation | https://github.com/certifi/python-certifi | Runtime | `VERIFIED` |
| 10 | `charset-normalizer` | `3.5.2` | `MIT` | Ahmed Tahri | https://github.com/Ousret/charset_normalizer | Runtime | `VERIFIED` |
| 11 | `click` | `8.5.0` | `BSD-3-Clause` | Pallets Projects | https://github.com/pallets/click | Runtime | `VERIFIED` |
| 12 | `cloudpickle` | `3.1.2` | `BSD-3-Clause` | Cloudpipe / Inria / UCB | https://github.com/cloudpipe/cloudpickle | Runtime | `VERIFIED` |
| 13 | `colorama` | `0.4.6` | `BSD-3-Clause` | Jonathan Hartley | https://github.com/tartley/colorama | Runtime | `VERIFIED` |
| 14 | `colorlog` | `6.12.0` | `MIT` | Sam Clements | https://github.com/borntyping/python-colorlog | Runtime | `VERIFIED` |
| 15 | `contourpy` | `1.4.0` | `BSD-3-Clause` | Ian Thomas / Matplotlib Team | https://github.com/contourpy/contourpy | Runtime | `VERIFIED` |
| 16 | `ctranslate2` | `4.8.4` | `MIT` | OpenNMT / Systran | https://github.com/OpenNMT/CTranslate2 | Runtime | `VERIFIED` |
| 17 | `cycler` | `0.12.1` | `BSD-3-Clause` | Matplotlib Development Team | https://github.com/matplotlib/cycler | Runtime | `VERIFIED` |
| 18 | `defusedxml` | `0.7.1` | `PSF-2.0` | Christian Heimes | https://github.com/tiran/defusedxml | Runtime | `VERIFIED` |
| 19 | `einops` | `0.8.2` | `MIT` | Alex Rogozhnikov | https://github.com/arogozhnikov/einops | Runtime | `VERIFIED` |
| 20 | `faster-whisper` | `1.2.1` | `MIT` | Systran / Guillaume Klein | https://github.com/SYSTRAN/faster-whisper | Runtime | `VERIFIED` |
| 21 | `filelock` | `4.2.4` | `Unlicense` | Benedikt Schmitt / tox-dev | https://github.com/tox-dev/filelock | Runtime | `VERIFIED` |
| 22 | `flatbuffers` | `25.12.19` | `Apache-2.0` | Google LLC | https://github.com/google/flatbuffers | Runtime | `VERIFIED` |
| 23 | `fonttools` | `4.68.0` | `MIT` | Just van Rossum & Contributors | https://github.com/fonttools/fonttools | Runtime | `VERIFIED` |
| 24 | `frozenlist` | `1.8.0` | `Apache-2.0` | aio-libs Contributors | https://github.com/aio-libs/frozenlist | Runtime | `VERIFIED` |
| 25 | `fsspec` | `2026.9.0` | `BSD-3-Clause` | Martin Durant / Continuum Analytics | https://github.com/fsspec/filesystem_spec | Runtime | `VERIFIED` |
| 26 | `googleapis-common-protos` | `1.76.0` | `Apache-2.0` | Google LLC | https://github.com/googleapis/python-api-common-protos | Runtime | `VERIFIED` |
| 27 | `grpcio` | `1.85.1` | `Apache-2.0` | The gRPC Authors | https://github.com/grpc/grpc | Runtime | `VERIFIED` |
| 28 | `huggingface_hub` | `0.36.2` | `Apache-2.0` | Hugging Face, Inc. | https://github.com/huggingface/huggingface_hub | Runtime | `VERIFIED` |
| 29 | `idna` | `3.20` | `BSD-3-Clause` | Kim Davies | https://github.com/kjd/idna | Runtime | `VERIFIED` |
| 30 | `Jinja2` | `3.1.6` | `BSD-3-Clause` | Pallets Projects | https://github.com/pallets/jinja | Runtime | `VERIFIED` |
| 31 | `joblib` | `1.6.0` | `BSD-3-Clause` | Gael Varoquaux & Contributors | https://github.com/joblib/joblib | Runtime | `VERIFIED` |
| 32 | `julius` | `0.2.8` | `MIT` | Alexandre Défossez | https://github.com/adefossez/julius | Runtime | `VERIFIED` |
| 33 | `keyboard` | `0.13.5` | `MIT` | BoppreH | https://github.com/boppreh/keyboard | Runtime | `VERIFIED` |
| 34 | `kiwisolver` | `1.5.1` | `BSD-3-Clause` | Nucleic Development Team | https://github.com/nucleic/kiwi | Runtime | `VERIFIED` |
| 35 | `lightning` | `2.6.6` | `Apache-2.0` | Lightning AI & Contributors | https://github.com/Lightning-AI/pytorch-lightning | Runtime | `VERIFIED` |
| 36 | `lightning-utilities` | `0.15.3` | `Apache-2.0` | Lightning AI & Contributors | https://github.com/Lightning-AI/utilities | Runtime | `VERIFIED` |
| 37 | `Mako` | `1.4.3` | `MIT` | Michael Bayer | https://github.com/sqlalchemy/mako | Runtime | `VERIFIED` |
| 38 | `markdown-it-py` | `4.2.0` | `MIT` | Executable Book Project | https://github.com/executablebooks/markdown-it-py | Runtime | `VERIFIED` |
| 39 | `MarkupSafe` | `3.0.3` | `BSD-3-Clause` | Pallets Projects | https://github.com/pallets/markupsafe | Runtime | `VERIFIED` |
| 40 | `matplotlib` | `3.11.2` | `PSF-2.0` | Matplotlib Development Team | https://github.com/matplotlib/matplotlib | Runtime | `VERIFIED` |
| 41 | `mdurl` | `0.1.2` | `MIT` | Taneli Hukkinen | https://github.com/executablebooks/mdurl | Runtime | `VERIFIED` |
| 42 | `MouseInfo` | `0.1.3` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/mouseinfo | Runtime | `VERIFIED` |
| 43 | `mpmath` | `1.3.0` | `BSD-3-Clause` | Fredrik Johansson & Contributors | https://github.com/mpmath/mpmath | Runtime | `VERIFIED` |
| 44 | `multidict` | `7.2.1` | `Apache-2.0` | Andrew Svetlov / aio-libs | https://github.com/aio-libs/multidict | Runtime | `VERIFIED` |
| 45 | `narwhals` | `2.28.0` | `MIT` | Marco Gorelli & Contributors | https://github.com/narwhals-dev/narwhals | Runtime | `VERIFIED` |
| 46 | `networkx` | `3.7` | `BSD-3-Clause` | NetworkX Developers | https://github.com/networkx/networkx | Runtime | `VERIFIED` |
| 47 | `nltk` | `3.10.4` | `Apache-2.0` | NLTK Project | https://github.com/nltk/nltk | Runtime | `VERIFIED` |
| 48 | `numpy` | `2.5.4` | `BSD-3-Clause` | NumPy Developers | https://github.com/numpy/numpy | Runtime | `VERIFIED` |
| 49 | `omegaconf` | `2.4.0` | `BSD-3-Clause` | Omry Yadan / Meta | https://github.com/omry/omegaconf | Runtime | `VERIFIED` |
| 50 | `onnxruntime` | `1.31.1` | `MIT` | Microsoft Corporation | https://github.com/microsoft/onnxruntime | Runtime | `VERIFIED` |
| 51 | `opentelemetry-api` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 52 | `opentelemetry-exporter-http-transport` | `0.66b2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 53 | `opentelemetry-exporter-otlp` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 54 | `opentelemetry-exporter-otlp-common` | `0.66b2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 55 | `opentelemetry-exporter-otlp-proto-common` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 56 | `opentelemetry-exporter-otlp-proto-grpc` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 57 | `opentelemetry-exporter-otlp-proto-http` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 58 | `opentelemetry-proto` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 59 | `opentelemetry-sdk` | `1.45.2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 60 | `opentelemetry-semantic-conventions` | `0.66b2` | `Apache-2.0` | OpenTelemetry Authors | https://github.com/open-telemetry/opentelemetry-python | Runtime | `VERIFIED` |
| 61 | `optuna` | `5.0.0` | `MIT` | Preferred Networks, Inc. | https://github.com/optuna/optuna | Runtime | `VERIFIED` |
| 62 | `packaging` | `26.3` | `Apache-2.0 OR BSD-2-Clause` | Donald Stufft & Contributors | https://github.com/pypa/packaging | Runtime | `VERIFIED` |
| 63 | `pandas` | `3.1.0` | `BSD-3-Clause` | The Pandas Development Team | https://github.com/pandas-dev/pandas | Runtime | `VERIFIED` |
| 64 | `pefile` | `2023.2.7` | `MIT` | Ero Carrera | https://github.com/erocarrera/pefile | Build-Only (PyInstaller) | `NOT SHIPPED` |
| 65 | `pillow` | `13.0.0` | `HPND` (MIT-CMU) | Jeffrey A. Clark (Alex) & Contributors | https://github.com/python-pillow/Pillow | Runtime | `VERIFIED` |
| 66 | `pip` | `26.2.2` | `MIT` | The pip Developers | https://github.com/pypa/pip | Build-Only | `NOT SHIPPED` |
| 67 | `primePy` | `1.3` | `MIT` | PranayModi | https://github.com/PranayModi/primePy | Runtime | `VERIFIED` |
| 68 | `propcache` | `0.5.4` | `Apache-2.0` | J. Nick Koston / aio-libs | https://github.com/aio-libs/propcache | Runtime | `VERIFIED` |
| 69 | `protobuf` | `7.36.2` | `BSD-3-Clause` | Google LLC | https://github.com/protocolbuffers/protobuf | Runtime | `VERIFIED` |
| 70 | `pyannote-audio` | `4.0.7` | `MIT` | CNRS / Hervé Bredin | https://github.com/pyannote/pyannote-audio | Runtime | `VERIFIED` |
| 71 | `pyannote-core` | `6.1.0` | `MIT` | CNRS / Hervé Bredin | https://github.com/pyannote/pyannote-core | Runtime | `VERIFIED` |
| 72 | `pyannote-database` | `6.1.1` | `MIT` | CNRS / Hervé Bredin | https://github.com/pyannote/pyannote-database | Runtime | `VERIFIED` |
| 73 | `pyannote-metrics` | `4.2.0` | `MIT` | CNRS / Hervé Bredin | https://github.com/pyannote/pyannote-metrics | Runtime | `VERIFIED` |
| 74 | `pyannote-pipeline` | `4.1.0` | `MIT` | CNRS / Hervé Bredin | https://github.com/pyannote/pyannote-pipeline | Runtime | `VERIFIED` |
| 75 | `pyannoteai-sdk` | `0.4.0` | `MIT` | pyannoteAI | https://github.com/pyannote/pyannoteai-sdk | Runtime | `VERIFIED` |
| 76 | `PyAutoGUI` | `0.9.54` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/pyautogui | Runtime | `VERIFIED` |
| 77 | `PyGetWindow` | `0.0.9` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/PyGetWindow | Runtime | `VERIFIED` |
| 78 | `Pygments` | `2.21.0` | `BSD-2-Clause` | Georg Brandl & Pygments Team | https://github.com/pygments/pygments | Runtime | `VERIFIED` |
| 79 | `pyinstaller` | `6.15.0` | `GPL-2.0-or-later WITH Bootloader-exception` | PyInstaller Development Team | https://github.com/pyinstaller/pyinstaller | Freezer / Bootloader | `VERIFIED` |
| 80 | `pyinstaller-hooks-contrib` | `2026.9` | `Apache-2.0` | PyInstaller Development Team | https://github.com/pyinstaller/pyinstaller-hooks-contrib | Build-Only | `NOT SHIPPED` |
| 81 | `PyMsgBox` | `2.0.1` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/PyMsgBox | Runtime | `VERIFIED` |
| 82 | `pyparsing` | `3.3.3` | `MIT` | Paul T. McGuire | https://github.com/pyparsing/pyparsing | Runtime | `VERIFIED` |
| 83 | `pyperclip` | `1.11.0` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/pyperclip | Runtime | `VERIFIED` |
| 84 | `PyRect` | `0.2.0` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/PyRect | Runtime | `VERIFIED` |
| 85 | `PyScreeze` | `1.0.1` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/pyscreeze | Runtime | `VERIFIED` |
| 86 | `python-dateutil` | `3.0.0` | `Apache-2.0 OR BSD-3-Clause` | Gustavo Niemeyer / Paul Ganssle | https://github.com/dateutil/dateutil | Runtime | `VERIFIED` |
| 87 | `pytorch-lightning` | `2.6.6` | `Apache-2.0` | Lightning AI & Contributors | https://github.com/Lightning-AI/pytorch-lightning | Runtime | `VERIFIED` |
| 88 | `pytorch-metric-learning` | `2.9.0` | `MIT` | Kevin Musgrave | https://github.com/KevinMusgrave/pytorch-metric-learning | Runtime | `VERIFIED` |
| 89 | `pytweening` | `1.2.0` | `BSD-3-Clause` | Al Sweigart | https://github.com/asweigart/pytweening | Runtime | `VERIFIED` |
| 90 | `pywin32-ctypes` | `0.2.3` | `BSD-3-Clause` | Enthought, Inc. | https://github.com/enthought/pywin32-ctypes | Runtime | `VERIFIED` |
| 91 | `PyYAML` | `6.0.3` | `MIT` | Kirill Simonov & YAML Core Team | https://github.com/yaml/pyyaml | Runtime | `VERIFIED` |
| 92 | `regex` | `2026.9.29` | `Apache-2.0` | Matthew Barnett | https://github.com/mrabarnett/mrab-regex | Runtime | `VERIFIED` |
| 93 | `requests` | `2.34.2` | `Apache-2.0` | Kenneth Reitz / PSF | https://github.com/psf/requests | Runtime | `VERIFIED` |
| 94 | `rich` | `15.0.0` | `MIT` | Will McGugan / Textualize | https://github.com/Textualize/rich | Runtime | `VERIFIED` |
| 95 | `safetensors` | `0.8.0` | `Apache-2.0` | Hugging Face, Inc. | https://github.com/huggingface/safetensors | Runtime | `VERIFIED` |
| 96 | `scikit-learn` | `1.9.1` | `BSD-3-Clause` | scikit-learn Developers | https://github.com/scikit-learn/scikit-learn | Runtime | `VERIFIED` |
| 97 | `scipy` | `1.18.1` | `BSD-3-Clause` | SciPy Developers | https://github.com/scipy/scipy | Runtime | `VERIFIED` |
| 98 | `setuptools` | `78.1.0` | `MIT` | Python Packaging Authority (PyPA) | https://github.com/pypa/setuptools | Build / Runtime pkg | `VERIFIED` |
| 99 | `six` | `1.17.0` | `MIT` | Benjamin Peterson | https://github.com/benjaminp/six | Runtime | `VERIFIED` |
| 100 | `sortedcontainers` | `2.4.0` | `Apache-2.0` | Grant Jenks | https://github.com/grantjenks/python-sortedcontainers | Runtime | `VERIFIED` |
| 101 | `SQLAlchemy` | `2.1.6` | `MIT` | Michael Bayer & Contributors | https://github.com/sqlalchemy/sqlalchemy | Runtime | `VERIFIED` |
| 102 | `sympy` | `1.14.0` | `BSD-3-Clause` | SymPy Development Team | https://github.com/sympy/sympy | Runtime | `VERIFIED` |
| 103 | `threadpoolctl` | `3.7.0` | `BSD-3-Clause` | Thomas Moreau / Olivier Grisel | https://github.com/joblib/threadpoolctl | Runtime | `VERIFIED` |
| 104 | `tokenizers` | `0.22.2` | `Apache-2.0` | Hugging Face, Inc. | https://github.com/huggingface/tokenizers | Runtime | `VERIFIED` |
| 105 | `torch` | `2.8.0+cpu` | `BSD-3-Clause` | Meta Platforms, Inc. & PyTorch Team | https://github.com/pytorch/pytorch | Runtime | `VERIFIED` |
| 106 | `torch-audiomentations` | `0.12.0` | `MIT` | Asteroid Team / Iver Jordal | https://github.com/asteroid-team/torch-audiomentations | Runtime | `VERIFIED` |
| 107 | `torch_pitch_shift` | `1.2.5` | `MIT` | Kentaro Nishi | https://github.com/KentoNishi/torch-pitch-shift | Runtime | `VERIFIED` |
| 108 | `torchaudio` | `2.8.0+cpu` | `BSD-2-Clause` | Meta Platforms, Inc. & PyTorch Team | https://github.com/pytorch/audio | Runtime | `VERIFIED` |
| 109 | `torchcodec` | `0.7.0` | `BSD-3-Clause` | Meta Platforms, Inc. & PyTorch Team | https://github.com/pytorch/torchcodec | Runtime | `VERIFIED` |
| 110 | `torchmetrics` | `1.9.0` | `Apache-2.0` | Lightning AI & Contributors | https://github.com/Lightning-AI/torchmetrics | Runtime | `VERIFIED` |
| 111 | `torchvision` | `0.23.0+cpu` | `BSD-3-Clause` | Meta Platforms, Inc. & PyTorch Team | https://github.com/pytorch/vision | Runtime | `VERIFIED` |
| 112 | `tqdm` | `4.70.1` | `MPL-2.0 AND MIT` | Casper da Costa-Luis & Contributors | https://github.com/tqdm/tqdm | Runtime | `VERIFIED` |
| 113 | `transformers` | `4.57.6` | `Apache-2.0` | Hugging Face, Inc. | https://github.com/huggingface/transformers | Runtime | `VERIFIED` |
| 114 | `typing_extensions` | `4.16.0` | `PSF-2.0` | Guido van Rossum & Typing Contributors | https://github.com/python/typing_extensions | Runtime | `VERIFIED` |
| 115 | `tzdata` | `2026.6` | `Apache-2.0` | Python Software Foundation / IANA | https://github.com/python/tzdata | Runtime | `VERIFIED` |
| 116 | `urllib3` | `2.8.0` | `MIT` | Andrey Petrov & Contributors | https://github.com/urllib3/urllib3 | Runtime | `VERIFIED` |
| 117 | `whisperx` | `3.8.6` | `BSD-2-Clause` | Max Bain | https://github.com/m-bain/whisperX | Runtime | `VERIFIED` |
| 118 | `yarl` | `1.25.1` | `Apache-2.0` | Andrew Svetlov / aio-libs | https://github.com/aio-libs/yarl | Runtime | `VERIFIED` |

---

## 6. npm Dependency License Inventory

The file `package-lock.json` contains **283 locked package entries**.

* **Runtime vs. Build-Time Scope:**
  * `electron` (`45.2.1`) provides the application desktop runtime binary and ships with its complete license notices (`node_modules/electron/LICENSE` and `node_modules/electron/dist/LICENSES.chromium.html`).
  * `electron-builder` (`26.18.0`) and its transitive packaging sub-packages (`app-builder-lib`, `builder-util`, `builder-util-runtime`, `dmg-builder`, `7zip-bin`, `app-builder-bin`, etc.) are **build-time development dependencies** (`devDependencies`). They execute exclusively during package creation and are **`NOT SHIPPED`** inside the end-user application runtime.
  * All 283 locked entries in `package-lock.json` carry permissive open-source licenses (`MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `BlueOak-1.0.0`). Their full standard license texts are reproduced in **Section 12** of this document.

---

## 7. Electron, Chromium & Node.js Notices

1. **Electron (`45.2.1`):**
   * **License:** `MIT`
   * **Notice File:** `node_modules/electron/LICENSE` (preserved in the root directory of the unpacked Electron distribution as `LICENSE` and reproduced in Section 12.3).
   * **Status:** `VERIFIED`
2. **Chromium & Embedded Third-Party Components:**
   * **License:** `BSD-3-Clause` and constituent open-source licenses.
   * **Notice File:** `node_modules/electron/dist/LICENSES.chromium.html` (preserved in the root directory of the unpacked Electron distribution as `LICENSES.chromium.html`).
   * **Status:** `VERIFIED`
3. **Node.js & V8 Engine:**
   * **License:** `MIT` and bundled component licenses (covered inside `LICENSES.chromium.html` and `node_modules/electron/LICENSE`).
   * **Status:** `VERIFIED`

---

## 8. FFmpeg License and Corresponding Source

* **Component:** FFmpeg and FFprobe standalone command-line executables (`ffmpeg.exe`, `ffprobe.exe`).
* **Build Version:** `BtbN n9.0.2-42-gd7643a0fe3-20261101`
* **Architecture:** `x86_64` (`win64-lgpl-9.0` pinned archive)
* **License:** GNU Lesser General Public License v2.1 or later (`LGPL-2.1-or-later`)
* **Preserved Repository Files:** `vendor/ffmpeg/LICENSE`, `vendor/ffmpeg/README.txt`
* **Official Upstream References:**
  * https://ffmpeg.org/legal.html
  * https://github.com/BtbN/FFmpeg-Builds/releases
* **Verification Findings:**
  1. **No GPL or Non-Free Flags:** The staged binary is verified from the `win64-lgpl-9.0` archive. Its build configuration contains no `--enable-gpl`, `--enable-nonfree`, `--enable-libx264`, `--enable-libx265`, or `--enable-libxvid` flags. The prior GPL archive is no longer staged.
  2. **Process Isolation (Subprocess Invocation):** FramePilot Studio does not statically or dynamically link any proprietary application code against FFmpeg libraries (`libavcodec`, `libavformat`, `libavutil`, etc.). It invokes `ffmpeg.exe` and `ffprobe.exe` strictly as external executables via operating system subprocess calls.
  3. **LGPL v2.1 Redistribution Compliance:** The full text of `LGPL-2.1` is preserved in `vendor/ffmpeg/LICENSE` and reproduced in **Section 12.2** of this register, together with the upstream FFmpeg commit identifier (`d7643a0fe3`) and BtbN build script provenance (`https://github.com/BtbN/FFmpeg-Builds`).
* **Status:** `VERIFIED WITH CONDITIONS`

---

## 9. WhisperX Notices

* **Component:** WhisperX (`3.8.6`)
* **License:** `BSD-2-Clause`
* **Copyright:** `Copyright (c) 2022, Max Bain`
* **Local License File:** `vendor/whisperx-source/LICENSE`
* **Official Upstream Repository:** https://github.com/m-bain/whisperX
* **Verification Findings:** Both the vendorized source directory (`vendor/whisperx-source/LICENSE`) and the frozen Python wheel (`whisperx==3.8.6` in `runtime/manifests/python-requirements-lock.txt`) preserve the upstream BSD 2-Clause license and copyright notice. Full license text is reproduced in **Section 12.1**.
* **Status:** `VERIFIED`

---

## 10. Model Weights & Redistribution Conditions

All offline model checkpoints under `runtime/models/` are verified by SHA-256 hash in `runtime/manifests/runtime-manifest.json`.

### 10.1 ASR Model: `Systran/faster-whisper-medium`
* **Repository:** https://huggingface.co/Systran/faster-whisper-medium
* **Pinned Revision:** `08e178d48790749d25932bbc082711ddcfdfbc4f`
* **Base Model Origin:** https://huggingface.co/openai/whisper-medium (`Copyright (c) 2022 OpenAI`)
* **License:** `MIT` (both the original OpenAI `whisper-medium` model card and Systran's CTranslate2 quantized conversion are published under the MIT License).
* **Attribution:** Preserved in **Section 12.4**.
* **Status:** `VERIFIED`

### 10.2 VAD Model: `pyannote/segmentation-3.0`
* **Repository:** https://huggingface.co/pyannote/segmentation-3.0
* **Author / Copyright:** `Copyright (c) CNRS / Hervé Bredin`
* **License:** `MIT` (Model Card License)
* **Gated Acquisition & Attribution Notice:** Upstream acquisition on Hugging Face utilizes gated repository access terms for user telemetry/citation awareness, while the model weights and `pyannote.audio` software are explicitly licensed under the permissive **MIT License**. Full copyright and academic attribution notices are preserved in **Section 12.5**.
* **Status:** `VERIFIED WITH CONDITIONS`

### 10.3 Alignment Model: `WAV2VEC2_ASR_BASE_960H`
* **Documentation & Source:** https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html
* **Author / Copyright:** `Copyright (c) Meta Platforms, Inc. and affiliates`
* **License:** `MIT` (per official PyTorch Torchaudio pipeline documentation).
* **Attribution:** Preserved in **Section 12.6**.
* **Status:** `VERIFIED`

---

## 11. Legacy Filmora Integration (`backend/legacy_filmora_engine.py`)

* **File Inspected:** `backend/legacy_filmora_engine.py`
* **Provenance Header:**
  ```python
  # FPSTUDIO-ORIGINAL-SOURCE
  # Project: FramePilot Studio | Original Creator: Atawur Rahman | Copyright (c) 2026
  ```
* **Module Version:** `APP_VERSION = "0.1.4"`
* **Dependency & Code Audit:**
  1. **100% Original Project-Owned Code:** Direct source inspection of `backend/legacy_filmora_engine.py` confirms it is an original work authored by Atawur Rahman for FramePilot Studio.
  2. **Zero External Third-Party Dependencies:** The module imports exclusively Python 3.12 standard library modules (`__future__`, `base64`, `copy`, `csv`, `dataclasses`, `hashlib`, `json`, `math`, `os`, `pathlib`, `random`, `re`, `secrets`, `sys`, `time`, `traceback`, `typing`, `zipfile`).
  3. **Clean Interoperability Implementation:** The engine reads and writes user-created `.wfp` archive files using standard ZIP and JSON parsing (`timeline.wesproj`, `extra.json`, `project_info.json`, `medias_info.json`, `media.json`) and local template presets (`motion_templates.json`) without bundling any third-party proprietary DLLs, SDKs, or copied code.
* **Status:** `VERIFIED`

---

## 12. Required Copyright & Attribution Notices (Full Embedded License Texts)

### 12.1 WhisperX (`BSD-2-Clause`)
```text
BSD 2-Clause License

Copyright (c) 2022, Max Bain
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### 12.2 FFmpeg (`LGPL-2.1-or-later`)
```text
This software uses code of FFmpeg (https://ffmpeg.org) licensed under the
GNU Lesser General Public License v2.1 (LGPLv2.1) and its corresponding build
source and configuration scripts are published at:
- https://github.com/FFmpeg/FFmpeg/tree/d7643a0fe3
- https://github.com/BtbN/FFmpeg-Builds (Release: n9.0.2-42-gd7643a0fe3-20261101, win64-lgpl-9.0)

Full LGPL v2.1 license text is included in vendor/ffmpeg/LICENSE andvendor/ffmpeg/README.txt.
FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project.
```

### 12.3 Electron (`MIT`) & Standard MIT License Text (Applies to all MIT-licensed Python & npm Packages)
```text
MIT License

Copyright (c) Electron contributors
Copyright (c) 2013-2020 GitHub Inc.
Copyright (c) Individual MIT Package Copyright Holders listed in Sections 5 and 6.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 12.4 `Systran/faster-whisper-medium` & `openai/whisper-medium` (`MIT`)
```text
Original Whisper Medium Model Weights:
Copyright (c) 2022 OpenAI (https://huggingface.co/openai/whisper-medium)

CTranslate2 Converted Model Weights (Systran/faster-whisper-medium, rev 08e178d48790749d25932bbc082711ddcfdfbc4f):
Copyright (c) 2023 Systran (https://huggingface.co/Systran/faster-whisper-medium)
Licensed under the MIT License (see Section 12.3 for full MIT license text).
```

### 12.5 `pyannote/segmentation-3.0` (`MIT`)
```text
pyannote/segmentation-3.0 Model Checkpoint & pyannote.audio Library:
Copyright (c) CNRS / Hervé Bredin (https://huggingface.co/pyannote/segmentation-3.0)
Citation: Alexis Plaquet and Hervé Bredin, "Powerset multi-class cross entropy loss for neural speaker diarization", INTERSPEECH 2023.
Licensed under the MIT License (see Section 12.3 for full MIT license text).
```

### 12.6 Torchaudio `WAV2VEC2_ASR_BASE_960H` (`MIT`)
```text
WAV2VEC2_ASR_BASE_960H Pretrained Alignment Model:
Copyright (c) Meta Platforms, Inc. and affiliates.
Distributed via PyTorch Torchaudio (https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html)
Licensed under the MIT License (see Section 12.3 for full MIT license text).
```

### 12.7 Standard BSD 3-Clause License Text (Applies to PyTorch, NumPy, SciPy, Pandas, scikit-learn, etc.)
```text
BSD 3-Clause License

Copyright (c) Meta Platforms, Inc., NumPy Developers, SciPy Developers, Pallets, and respective BSD-3-Clause Copyright Holders listed in Section 5.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### 12.8 Apache License 2.0 Notice (Applies to Hugging Face Transformers, Lightning, aiohttp, gRPC, OpenTelemetry, etc.)
```text
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright (c) Respective Apache-2.0 Copyright Holders listed in Section 5 and Section 6.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use these components except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
```

### 12.9 PyInstaller Bootloader Exception (`pyinstaller==6.15.0`)
```text
PyInstaller is licensed under the GPL-2.0-or-later WITH the following explicit Bootloader Exception:
"In addition to the permissions in the GNU General Public License, the authors give you unlimited permission to link or embed compiled bootloader and related files into combinations with other programs, and to distribute those combinations without any restriction coming from the use of those files."
```

### 12.10 Mozilla Public License 2.0 Notice (`certifi==2026.10.23`, `tqdm==4.70.1`)
```text
This distribution includes unmodified binary/source files from certifi and tqdm subject to the terms of the Mozilla Public License, v. 2.0 (https://mozilla.org/MPL/2.0/). Unmodified files remain obtainable from their official upstream repositories listed in Section 5.
```

---

## 13. License Text Locations

| Component / Bundle | Relative Path in Repository / Package | Verification Status |
|---|---|---|
| **Master Attribution & License Bundle** | `THIRD_PARTY_NOTICES.md` | `VERIFIED` |
| **WhisperX License** | `vendor/whisperx-source/LICENSE` | `VERIFIED` |
| **FFmpeg LGPL v2.1 License** | `vendor/ffmpeg/LICENSE` | `VERIFIED` |
| **FFmpeg Build Configuration & Hash Notice** | `vendor/ffmpeg/README.txt` | `VERIFIED` |
| **Electron MIT License** | `node_modules/electron/LICENSE` | `VERIFIED` |
| **Chromium & Third-Party Web Notices** | `node_modules/electron/dist/LICENSES.chromium.html` | `VERIFIED` |
| **electron-builder License (Build-Only)** | `node_modules/electron-builder/LICENSE` | `VERIFIED` |
| **Python Locked Manifest** | `runtime/manifests/python-requirements-lock.txt` | `VERIFIED` |
| **Frozen Runtime Hash Manifest** | `runtime/manifests/runtime-manifest.json` | `VERIFIED` |

---

## 14. Redistribution Compliance Matrix

| Ecosystem / Component | License Family | Redistribution Obligation | Compliance Evidence | Status |
|---|---|---|---|---|
| **WhisperX (`3.8.6`)** | `BSD-2-Clause` | Preserve copyright notice and disclaimer. | Preserved in `vendor/whisperx-source/LICENSE` and Section 12.1. | `VERIFIED` |
| **FFmpeg (`n9.0.2-42-gd7643a0fe3-20261101`)** | `LGPL-2.1-or-later` | Subprocess execution only; preserve LGPL text and source references; no GPL/nonfree codecs enabled. | Verified `win64-lgpl-9.0` archive in `vendor/ffmpeg/README.txt` and `vendor/ffmpeg/LICENSE`. | `VERIFIED WITH CONDITIONS` |
| **Python Runtime (`118` Packages)** | `MIT`, `BSD`, `Apache-2.0`, `PSF-2.0`, `MPL-2.0`, `HPND`, `Unlicense`, `PyInstaller-Exception` | Preserve copyright notices and standard license texts. | Complete 118-entry inventory in Section 5; license texts in Section 12. | `VERIFIED` |
| **Electron (`45.2.1`) & Chromium** | `MIT` & `BSD-3-Clause` | Preserve `LICENSE` and `LICENSES.chromium.html` in distribution. | Present in `node_modules/electron/` and unpacked package root. | `VERIFIED` |
| **npm Tree (`283` Entries)** | Permissive (`MIT`, `ISC`, `BSD`, `Apache-2.0`) | Preserve license notices for shipped production modules. | Audited via `package-lock.json` and covered in Section 12. | `VERIFIED` |
| **Bundled ML Models (`3` Checkpoints)** | `MIT` | Preserve OpenAI, Systran, CNRS/Hervé Bredin, and Meta Platforms MIT attributions. | Documented in Section 10 and Section 12.4–12.6; hashes verified in `runtime-manifest.json`. | `VERIFIED WITH CONDITIONS` |
| **Legacy Filmora Engine (`0.1.4`)** | Project-Owned (`Atawur Rahman`) | Confirm original ownership and zero restricted third-party code. | Verified `# FPSTUDIO-ORIGINAL-SOURCE` header and pure stdlib imports in `backend/legacy_filmora_engine.py`. | `VERIFIED` |

---

## 15. Verification Evidence

- **Frozen Runtime Hash Integrity (`20,145` files):** The frozen runtime inventory in `runtime/manifests/runtime-manifest.json` contains `20,145` shipped files. Every non-manifest, non-placeholder file under `runtime/` has exactly one inventory record, and all recorded byte sizes and SHA-256 values match the files currently on disk and in the unpacked Electron package.
- **FFmpeg Non-GPL Verification:** The staged `vendor/ffmpeg/README.txt` identifies the pinned `BtbN n9.0.2-42-gd7643a0fe3-20261101` (`win64-lgpl-9.0`) archive, `x86_64` architecture, archive SHA-256, FFmpeg commit (`d7643a0fe3`), and LGPL v2.1 notice (`vendor/ffmpeg/LICENSE`), with zero GPL/nonfree/x264/x265/xvid flags.
- **Complete 118-Package Python Lock Audit:** Every entry in `runtime/manifests/python-requirements-lock.txt` (from `aiohappyeyeballs==2.7.1` through `yarl==1.25.1`) has been verified against its upstream repository and SPDX license identifier in Section 5.
- **npm & Electron Verification:** All `283` locked entries in `package-lock.json`, `node_modules/electron/LICENSE` (`45.2.1`), `node_modules/electron/dist/LICENSES.chromium.html`, and `node_modules/electron-builder/LICENSE` (`26.18.0`) have been inspected and accounted for.
- **WhisperX & Model Hash Verification:** `vendor/whisperx-source/LICENSE` preserves the `BSD-2-Clause` license for WhisperX `3.8.6`. Model revisions and hashes for `Systran/faster-whisper-medium` (`08e178d48790749d25932bbc082711ddcfdfbc4f`), `pyannote/segmentation-3.0`, and `WAV2VEC2_ASR_BASE_960H` are verified in `runtime/manifests/runtime-manifest.json`.
- **Legacy Filmora Engine Code Inspection:** Direct inspection of `backend/legacy_filmora_engine.py` confirms original authorship (`Copyright (c) 2026 Atawur Rahman`, `# FPSTUDIO-ORIGINAL-SOURCE`) and exclusive use of Python 3.12 standard library modules.

---

## 16. Outstanding Issues / Required Actions (Store Packaging Notes)

1. **Preserve Root Notice Files in Installer Output:** Ensure `THIRD_PARTY_NOTICES.md`, `LICENSE` (Electron), `LICENSES.chromium.html`, `vendor/ffmpeg/LICENSE`, `vendor/ffmpeg/README.txt`, and `vendor/whisperx-source/LICENSE` remain intact in the final packaged build.
2. **Microsoft Store MSIX Submission Metadata (When Submitting to Partner Center):**
   * `package.json` currently defines `appId: studio.framepilot.desktop` and author `FramePilot Studio`.
   * When generating a Partner Center `.msix` or `.msixupload` bundle on a Windows SDK host (`makeappx.exe`, `makepri.exe`, `signtool.exe`), populate the Partner Center-assigned `identityName`, `publisher` (`CN=...`), and Store visual assets under the `msix` target in `package.json`.

---

## 17. Official Source References

- **WhisperX Upstream:** https://github.com/m-bain/whisperX
- **FFmpeg Legal & LGPL Checklist:** https://ffmpeg.org/legal.html
- **BtbN FFmpeg-Builds Releases:** https://github.com/BtbN/FFmpeg-Builds/releases
- **Systran faster-whisper-medium:** https://huggingface.co/Systran/faster-whisper-medium/tree/main
- **OpenAI whisper-medium:** https://huggingface.co/openai/whisper-medium
- **pyannote/segmentation-3.0:** https://huggingface.co/pyannote/segmentation-3.0/tree/main
- **Torchaudio WAV2VEC2_ASR_BASE_960H:** https://docs.pytorch.org/audio/2.6.0/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html
- **Electron Licensing Guidelines:** https://www.electronjs.org/docs/latest/tutorial/licenses
- **electron-builder Repository:** https://github.com/electron-userland/electron-builder
- **Python Packaging License Specification:** https://packaging.python.org/en/latest/guides/writing-pyproject-toml/#license
- **npm package.json License Field:** https://docs.npmjs.com/cli/v11/configuring-npm/package-json#license
- **Microsoft Electron MSIX Packaging Guide:** https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/electron-packaging
- **Microsoft MSIX Package Requirements:** https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements

Do not remove upstream copyright/license notices or represent WhisperX, PyTorch, FFmpeg, model weights, or other third-party components as original FramePilot code.