from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'runtime'
BACKEND_DIR = RUNTIME / 'backend' / 'FramePilotBackend'
BACKEND_EXE = BACKEND_DIR / 'FramePilotBackend.exe'
FFMPEG_DIR = RUNTIME / 'ffmpeg'
REQUIRED_BINARIES = [FFMPEG_DIR / 'ffmpeg.exe', FFMPEG_DIR / 'ffprobe.exe']
MODEL_DIR = RUNTIME / 'models'
MANIFEST = RUNTIME / 'manifests' / 'runtime-manifest.json'
SHA256_RE = re.compile(r'^[a-f0-9]{64}$')

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

missing: list[str] = []

if not BACKEND_EXE.is_file():
    missing.append('Frozen backend missing: runtime/backend/FramePilotBackend/FramePilotBackend.exe')
for binary in REQUIRED_BINARIES:
    if not binary.is_file() or binary.stat().st_size == 0:
        missing.append(f'Missing or empty bundled media binary: {binary.relative_to(ROOT)}')

if not MODEL_DIR.is_dir():
    missing.append('Private model directory missing: runtime/models/')

if not MANIFEST.is_file():
    missing.append('runtime/manifests/runtime-manifest.json is missing.')
else:
    try:
        data = json.loads(MANIFEST.read_text(encoding='utf-8-sig'))
        if data.get('product') != 'FramePilot Studio' or data.get('schema_version') != 1:
            missing.append('Runtime manifest has an unsupported product or schema version.')
        if data.get('status') != 'release-ready':
            missing.append('Runtime manifest status must be release-ready only after all validation gates pass.')

        whisperx = data.get('whisperx') or {}
        if whisperx.get('version') != '3.8.6':
            missing.append('WhisperX version must be explicitly pinned to the validated 3.8.6 runtime profile.')

        asr_models = whisperx.get('asr_models') or []
        align_models = whisperx.get('alignment_models') or []
        if not asr_models:
            missing.append('Runtime manifest has no offline WhisperX ASR model entry.')
        if not align_models:
            missing.append('Runtime manifest has no offline word-alignment model entry.')

        for label, models in (('ASR', asr_models), ('alignment', align_models)):
            for model in models:
                if not isinstance(model, dict):
                    missing.append(f'{label} model entry must be an object.')
                    continue
                rel = str(model.get('path') or '').strip()
                candidate = (RUNTIME / rel).resolve() if rel else None
                if not rel or candidate is None or RUNTIME.resolve() not in candidate.parents or not candidate.is_dir():
                    missing.append(f'{label} model path is missing or outside runtime: {rel or "(unspecified)"}')
                    continue
                required_files = model.get('required_files')
                if not isinstance(required_files, list) or not required_files:
                    missing.append(f'{label} model must list its required_files: {rel}')
                    continue
                for filename in required_files:
                    if not isinstance(filename, str) or not filename.strip():
                        missing.append(f'{label} model has an invalid required file declaration: {rel}')
                        continue
                    file_path = (candidate / filename).resolve()
                    if candidate not in file_path.parents or not file_path.is_file() or file_path.stat().st_size == 0:
                        missing.append(f'Required {label} model file missing or empty: {rel}/{filename}')
                if label == 'alignment':
                    loader = str(model.get('loader') or '').casefold()
                    if loader not in {'torchaudio', 'huggingface'}:
                        missing.append(f'Unsupported or missing alignment loader for {model.get("language", "unknown")}: {loader}')
                    if loader == 'torchaudio' and not str(model.get('model_name') or '').strip():
                        missing.append(f'Torchaudio model_name missing for {model.get("language", "unknown")}')

        # WhisperX 3.8.6's default pyannote VAD loads this local package asset.
        vad_asset = 'pytorch_model.bin'
        vad_matches = list(BACKEND_DIR.rglob(vad_asset)) if BACKEND_DIR.is_dir() else []
        vad_matches = [p for p in vad_matches if 'whisperx' in {part.casefold() for part in p.parts} and 'assets' in {part.casefold() for part in p.parts} and p.is_file() and p.stat().st_size > 0]
        if not vad_matches:
            missing.append('WhisperX local VAD asset not found in frozen backend: whisperx/assets/pytorch_model.bin')

        ffmpeg = data.get('ffmpeg') or {}
        ffmpeg_version = str(ffmpeg.get('version') or '').strip()
        ffmpeg_config = str(ffmpeg.get('configuration') or '').strip()
        if not ffmpeg_version or 'pending' in ffmpeg_version.casefold() or 'not built' in ffmpeg_version.casefold():
            missing.append('Exact FFmpeg version/build metadata is missing from runtime manifest.')
        if not ffmpeg_config or 'pending' in ffmpeg_config.casefold() or 'not audited' in ffmpeg_config.casefold():
            missing.append('FFmpeg -buildconf output is missing; audit the enabled codecs, filters and protocols.')

        records = data.get('files')
        if not isinstance(records, list) or not records:
            missing.append('Runtime manifest SHA-256 inventory is empty.')
        else:
            seen: set[str] = set()
            for record in records:
                if not isinstance(record, dict):
                    missing.append('Runtime inventory contains a non-object entry.')
                    continue
                rel = str(record.get('path') or '').strip().replace('\\', '/')
                digest = str(record.get('sha256') or '').lower()
                if not rel or rel.startswith('/') or '..' in Path(rel).parts or rel in seen:
                    missing.append(f'Runtime inventory path is invalid or duplicated: {rel or "(empty)"}')
                    continue
                seen.add(rel)
                target = (RUNTIME / rel).resolve()
                if RUNTIME.resolve() not in target.parents or not target.is_file():
                    missing.append(f'Runtime inventory file is missing or outside runtime: {rel}')
                    continue
                if not SHA256_RE.fullmatch(digest):
                    missing.append(f'Runtime inventory SHA-256 is invalid: {rel}')
                    continue
                actual_size = target.stat().st_size
                if record.get('size_bytes') != actual_size:
                    missing.append(f'Runtime inventory size mismatch: {rel}')
                actual_hash = sha256_file(target)
                if actual_hash != digest:
                    missing.append(f'Runtime inventory SHA-256 mismatch: {rel}')

            # Every required engine binary must be covered by the signed inventory.
            for target in [BACKEND_EXE, *REQUIRED_BINARIES]:
                rel = target.relative_to(RUNTIME).as_posix()
                if rel not in seen:
                    missing.append(f'Required executable is not covered by SHA-256 inventory: {rel}')
    except Exception as exc:
        missing.append(f'Runtime manifest invalid: {exc}')

notices_path = ROOT / 'THIRD_PARTY_NOTICES.md'
notices = notices_path.read_text(encoding='utf-8') if notices_path.is_file() else ''
if (not notices or 'release audit status: blocked' in notices.lower()
        or 'pending complete audit' in notices.lower() or '[pending audit]' in notices.lower()
        or 'pending:' in notices.lower()):
    missing.append('Third-party redistribution/license audit is still pending in THIRD_PARTY_NOTICES.md')

if missing:
    print('FramePilot Studio release preflight: BLOCKED')
    for item in missing:
        print(f' - {item}')
    print('\nDo not create or distribute a partial installer. Complete, hash and validate the full offline runtime first.')
    sys.exit(2)

print('FramePilot Studio release preflight: PASS')
