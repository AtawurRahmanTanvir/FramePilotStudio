# PyInstaller one-folder build specification — draft, validate against the pinned runtime.
from PyInstaller.utils.hooks import collect_all
from pathlib import Path
import sys

ROOT = Path(SPECPATH).resolve().parent
BACKEND = ROOT / 'backend'
WHISPERX_COPY = ROOT / 'vendor' / 'whisperx-source'
# Freeze the inspected project-owned WhisperX package copy, even though the
# build environment also has matching package metadata for its dependencies.
sys.path.insert(0, str(WHISPERX_COPY))

binaries, datas, hiddenimports = [], [], []
for package in ('whisperx', 'torch', 'torchaudio', 'torchvision', 'torchcodec', 'faster_whisper', 'ctranslate2', 'numpy', 'pandas', 'pyannote.audio', 'transformers', 'huggingface_hub', 'av', 'scipy', 'soundfile'):
    # These are required by the selected WhisperX 3.8.6 offline CPU profile.
    # Fail the build rather than silently omit a native module or VAD/model asset.
    pk_binaries, pk_datas, pk_hidden = collect_all(package)
    binaries += pk_binaries
    datas += pk_datas
    hiddenimports += pk_hidden

datas += [
    (str(BACKEND / 'legacy_filmora_engine.py'), '.'),
    (str(BACKEND / 'motion_templates.json'), '.'),
    (str(WHISPERX_COPY / 'LICENSE'), 'whisperx-license'),
]

a = Analysis(
    [str(BACKEND / 'framepilot' / 'entrypoint.py')],
    pathex=[str(WHISPERX_COPY), str(BACKEND), str(BACKEND / 'framepilot')],
    binaries=binaries,
    datas=datas,
    hiddenimports=list(set(hiddenimports + [
        'whisperx', 'torch', 'torchaudio', 'faster_whisper', 'ctranslate2',
        'legacy_filmora_engine', 'framepilot.csv_engine', 'framepilot.audio_engine',
        'framepilot.alignment_engine', 'framepilot.media_engine', 'framepilot.bridge',
        
    ])),
    hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=['tkinter', '_tkinter', 'pytest', 'IPython', 'notebook', 'jupyter', 'matplotlib'],
    noarchive=False, optimize=1,
)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='FramePilotBackend', debug=False,
          bootloader_ignore_signals=False, strip=False, upx=False, console=True,
          disable_windowed_traceback=False, argv_emulation=False, target_arch=None,
          codesign_identity=None, entitlements_file=None)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='FramePilotBackend')
