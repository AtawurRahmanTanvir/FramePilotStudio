from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class RuntimeManifestError(RuntimeError):
    pass


def load_runtime_manifest(runtime_root: Path) -> dict[str, Any]:
    manifest_path = runtime_root / 'manifests' / 'runtime-manifest.json'
    if not manifest_path.is_file():
        raise RuntimeManifestError(f'Offline runtime manifest is missing: {manifest_path}')
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    except Exception as exc:
        raise RuntimeManifestError(f'Offline runtime manifest is invalid: {exc}') from exc
    if manifest.get('product') != 'FramePilot Studio' or manifest.get('schema_version') != 1:
        raise RuntimeManifestError('The offline runtime manifest does not belong to this FramePilot Studio build.')
    return manifest


def resolve_model_entry(runtime_root: Path, entry: dict[str, Any], label: str) -> Path:
    relative = entry.get('path')
    if not isinstance(relative, str) or not relative.strip():
        raise RuntimeManifestError(f'{label} model path is missing from the offline runtime manifest.')
    root = runtime_root.resolve()
    candidate = (root / relative).resolve()
    if candidate == root or root not in candidate.parents:
        raise RuntimeManifestError(f'{label} model path escapes the private runtime directory.')
    if not candidate.is_dir():
        raise RuntimeManifestError(f'{label} model directory is missing: {candidate}')

    required = entry.get('required_files') or []
    if not isinstance(required, list) or any(not isinstance(item, str) or not item.strip() for item in required):
        raise RuntimeManifestError(f'{label} required_files must be an array of relative file names.')
    for filename in required:
        file_path = (candidate / filename).resolve()
        if candidate != file_path.parent and candidate not in file_path.parents:
            raise RuntimeManifestError(f'{label} required file escapes its model directory: {filename}')
        if not file_path.is_file() or file_path.stat().st_size == 0:
            raise RuntimeManifestError(f'{label} model file is missing or empty: {file_path}')

    if not required and not any(item.is_file() and item.stat().st_size > 0 for item in candidate.rglob('*')):
        raise RuntimeManifestError(f'{label} model files are missing: {candidate}')

    if label.casefold().endswith('alignment'):
        loader = str(entry.get('loader') or 'huggingface').casefold()
        if loader == 'torchaudio' and not str(entry.get('model_name') or '').strip():
            raise RuntimeManifestError(f'{label} torchaudio entry must declare model_name.')
        if loader not in {'torchaudio', 'huggingface'}:
            raise RuntimeManifestError(f'{label} has unsupported model loader: {loader}')
    return candidate


def validate_model_entries(runtime_root: Path, manifest: dict[str, Any]) -> tuple[list[tuple[dict[str, Any], Path]], list[tuple[dict[str, Any], Path]]]:
    whisperx = manifest.get('whisperx') or {}
    asr_entries = whisperx.get('asr_models') or []
    align_entries = whisperx.get('alignment_models') or []
    if not isinstance(asr_entries, list) or not asr_entries:
        raise RuntimeManifestError('No WhisperX ASR model is registered in the offline runtime manifest.')
    if not isinstance(align_entries, list) or not align_entries:
        raise RuntimeManifestError('No WhisperX word aligner is registered in the offline runtime manifest.')

    asr_valid = []
    for entry in asr_entries:
        if not isinstance(entry, dict) or not str(entry.get('name') or entry.get('id') or entry.get('model') or '').strip():
            raise RuntimeManifestError('Every ASR model entry must contain a model name.')
        path = resolve_model_entry(runtime_root, entry, f"ASR '{entry.get('name') or entry.get('id') or entry.get('model')}'")
        asr_valid.append((entry, path))

    align_valid = []
    seen_languages = set()
    for entry in align_entries:
        if not isinstance(entry, dict) or not str(entry.get('language') or '').strip():
            raise RuntimeManifestError('Every word aligner entry must declare a language code.')
        lang = str(entry['language']).casefold()
        if lang in seen_languages:
            raise RuntimeManifestError(f'Duplicate word aligner language entry: {lang}')
        seen_languages.add(lang)
        path = resolve_model_entry(runtime_root, entry, f"{lang} alignment")
        align_valid.append((entry, path))
    return asr_valid, align_valid
