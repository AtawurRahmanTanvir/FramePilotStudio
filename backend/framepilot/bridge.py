from __future__ import annotations
import hashlib, importlib.metadata, importlib.util, json, os, subprocess, sys, traceback
from pathlib import Path

ROOT = (Path(getattr(sys, '_MEIPASS')) if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1])
sys.path.insert(0, str(ROOT))
from framepilot.csv_engine import validate_master_csv
from framepilot.audio_engine import generate_final_master_csv
from framepilot.runtime_manifest import load_runtime_manifest, validate_model_entries
from framepilot.media_engine import ProcessingCancelled, check_cancelled, resolve_binary

# Existing WFP engine is retained as a versioned processing dependency.
import legacy_filmora_engine as legacy

_EVENT_STREAM = sys.stdout

if not getattr(sys, 'frozen', False):
    vendor_root = Path(os.environ.get('FRAMEPILOT_VENDOR_ROOT') or ROOT.parent / 'vendor').resolve()
    whisperx_source = vendor_root / 'whisperx-source'
    if whisperx_source.is_dir():
        sys.path.insert(0, str(whisperx_source))

def emit(event: str, **payload):
    print(json.dumps({'event': event, **payload}, ensure_ascii=False), file=_EVENT_STREAM, flush=True)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(4 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def _binary_health(name: str) -> tuple[bool, str | None, str | None]:
    try:
        binary = resolve_binary(name)
        result = subprocess.run([binary, '-version'], capture_output=True, text=True,
                                 encoding='utf-8', errors='replace', timeout=20, check=False)
        if result.returncode != 0:
            return False, binary, f'{name} -version exited {result.returncode}: {result.stderr.strip()}'
        first_line = (result.stdout or result.stderr).splitlines()[0].strip()
        if not first_line.lower().startswith(name.lower() + ' version '):
            return False, binary, f'{name} returned an unexpected version response: {first_line}'
        return True, binary, first_line
    except Exception as exc:
        return False, None, str(exc)


def runtime_info() -> dict:
    runtime_root = Path(os.environ.get('FRAMEPILOT_RUNTIME_ROOT') or ROOT.parent / 'runtime').resolve()
    missing: list[str] = []
    diagnostics: dict[str, dict] = {}
    vendor_root = Path(os.environ.get('FRAMEPILOT_VENDOR_ROOT') or ROOT.parent / 'vendor').resolve()
    if not getattr(sys, 'frozen', False) and (vendor_root / 'whisperx-source').is_dir():
        source = str(vendor_root / 'whisperx-source')
        if source not in sys.path:
            sys.path.insert(0, source)
    runtime_ffmpeg = runtime_root / 'ffmpeg'
    ffmpeg_health, ffmpeg_path, ffmpeg_version = _binary_health('ffmpeg')
    ffprobe_health, ffprobe_path, ffprobe_version = _binary_health('ffprobe')
    bundled_ffmpeg = (runtime_ffmpeg / ('ffmpeg.exe' if sys.platform == 'win32' else 'ffmpeg')).is_file()
    bundled_ffprobe = (runtime_ffmpeg / ('ffprobe.exe' if sys.platform == 'win32' else 'ffprobe')).is_file()
    diagnostics['ffmpeg'] = {'ready': ffmpeg_health, 'path': ffmpeg_path, 'version': ffmpeg_version}
    diagnostics['ffprobe'] = {'ready': ffprobe_health, 'path': ffprobe_path, 'version': ffprobe_version}

    whisperx_available = False
    torch_available = False
    dependency_versions: dict[str, str | None] = {}
    required_distributions = {
        'whisperx': 'whisperx', 'torch': 'torch', 'torchaudio': 'torchaudio',
        'faster_whisper': 'faster-whisper', 'ctranslate2': 'ctranslate2',
        'transformers': 'transformers', 'pyannote_audio': 'pyannote-audio',
        'huggingface_hub': 'huggingface-hub', 'numpy': 'numpy', 'pandas': 'pandas',
    }
    for key, distribution in required_distributions.items():
        try:
            dependency_versions[key] = importlib.metadata.version(distribution)
        except importlib.metadata.PackageNotFoundError:
            dependency_versions[key] = None
    try:
        import whisperx
        whisperx_available = True
        if importlib.util.find_spec('torch') is not None:
            import torch
            torch_available = True
    except Exception as exc:
        diagnostics['whisperx'] = {'ready': False, 'reason': str(exc)}

    asr_models: list[dict] = []
    alignment_models: list[dict] = []
    model_manifest_valid = False
    manifest_error = None
    manifest_status = 'missing'
    vad_model_available = False
    asr_file_hashes_ok = True
    alignment_file_hashes_ok = True
    try:
        model_manifest = load_runtime_manifest(runtime_root)
        manifest_status = str(model_manifest.get('status') or 'unknown')
        asr_valid, align_valid = validate_model_entries(runtime_root, model_manifest)
        asr_models = [entry for entry, _path in asr_valid]
        alignment_models = [entry for entry, _path in align_valid]
        for entries, paths, component in ((asr_models, [path for _, path in asr_valid], 'asr'),
                                          (alignment_models, [path for _, path in align_valid], 'alignment')):
            for entry, directory in zip(entries, paths):
                for relative, expected in (entry.get('files_sha256') or {}).items():
                    item = (directory / relative).resolve()
                    if directory not in item.parents or not item.is_file():
                        raise RuntimeError(f"Registered {component} file is missing: {item}")
                    actual = _sha256(item)
                    if actual.casefold() != str(expected).casefold():
                        if component == 'asr':
                            asr_file_hashes_ok = False
                        else:
                            alignment_file_hashes_ok = False
                        raise RuntimeError(f"SHA-256 mismatch for {component} model file {item}; expected {expected}, got {actual}")
        vad = model_manifest.get('whisperx', {}).get('vad') or {}
        vad_path = (runtime_root / str(vad.get('path') or '')).resolve()
        if not vad.get('path') or runtime_root not in vad_path.parents or not vad_path.is_file():
            raise RuntimeError(f"Registered local VAD model is missing: {vad_path}")
        vad_hash = str(vad.get('sha256') or '')
        if vad_hash and _sha256(vad_path).casefold() != vad_hash.casefold():
            raise RuntimeError(f"SHA-256 mismatch for local VAD model {vad_path}; expected {vad_hash}")
        if whisperx_available:
            from whisperx.vads.pyannote import Pyannote
            vad_health = Pyannote('cpu', model_fp=str(vad_path), vad_onset=0.5)
            del vad_health
        vad_model_available = True
        model_manifest_valid = True
    except Exception as exc:
        manifest_error = str(exc)
    ffmpeg_available = ffmpeg_health and ffprobe_health

    expected_versions = model_manifest.get('dependencies', {}) if 'model_manifest' in locals() else {}
    for key, expected in expected_versions.items():
        actual = dependency_versions.get(key)
        if actual != expected:
            diagnostics[key] = {'ready': False, 'expected': expected, 'actual': actual}
            missing.append(f'{key} {expected} is required; found {actual or "not installed"}')
        else:
            diagnostics[key] = {'ready': True, 'version': actual}
    if not whisperx_available:
        missing.append(f'WhisperX import failed: {diagnostics.get("whisperx", {}).get("reason", "package is missing")}')
    if not torch_available:
        missing.append('PyTorch could not be imported.')
    if not model_manifest_valid:
        missing.append(manifest_error or 'Offline ASR/VAD/alignment model pack is incomplete.')
    if not vad_model_available and model_manifest_valid:
        missing.append('Local WhisperX VAD model could not be verified.')
    if not ffmpeg_health:
        missing.append(f'Project FFmpeg is unavailable: {ffmpeg_version}')
    if not ffprobe_health:
        missing.append(f'Project FFprobe is unavailable: {ffprobe_version}')
    audio_ready = (whisperx_available and torch_available and vad_model_available
                   and model_manifest_valid and ffmpeg_health and ffprobe_health
                   and not any(not info.get('ready', True) for key, info in diagnostics.items()
                               if key in expected_versions))
    return {
        'runtime_root': str(runtime_root),
        'backend_mode': 'frozen' if getattr(sys, 'frozen', False) else 'development',
        'python_version': sys.version.split()[0],
        'whisperx_available': whisperx_available,
        'vad_model_available': vad_model_available,
        'torch_available': torch_available,
        'model_pack_available': model_manifest_valid,
        'model_manifest_error': manifest_error,
        'runtime_manifest_status': manifest_status,
        'dependency_versions': dependency_versions,
        'diagnostics': diagnostics,
        'asr_models': [{'name': entry.get('name') or entry.get('id') or entry.get('model'), 'label': entry.get('label')} for entry in asr_models],
        'default_asr_model': next((entry.get('name') or entry.get('id') or entry.get('model') for entry in asr_models if entry.get('default')), None),
        'alignment_languages': [entry.get('language') for entry in alignment_models if entry.get('language')],
        'bundled_ffmpeg_available': bundled_ffmpeg and bundled_ffprobe,
        'ffmpeg_available': ffmpeg_available,
        'ffmpeg_version': ffmpeg_version,
        'ffprobe_version': ffprobe_version,
        'asr_model_hashes_ok': asr_file_hashes_ok,
        'alignment_model_hashes_ok': alignment_file_hashes_ok,
        'audio_engine_ready': audio_ready,
        'missing_components': missing,
        'timeline_engine_available': True,
        'release_ready': getattr(sys, 'frozen', False) and manifest_status == 'release-ready' and audio_ready and bundled_ffmpeg and bundled_ffprobe,
    }

def main(argv: list[str]) -> int:
    # WhisperX and its dependencies may print diagnostics; stdout is reserved
    # for one-JSON-object-per-line IPC events consumed by Electron.
    sys.stdout = sys.stderr
    if len(argv) < 2:
        emit('error', message='Usage: bridge.py generate-csv <audio> <mapping> <output> <model> <compute> <device> <threads> <batch> | validate-csv <csv> | analyze-wfp <wfp> <csv|-> <image-folder|-> | runtime-info')
        return 2
    command = argv[1]
    try:
        if command == 'runtime-info':
            emit('result', runtime=runtime_info())
            return 0
        if command == 'generate-csv':
            check_cancelled()
            audio, mapping, output, model, compute_type, device, threads, batch = argv[2:10]
            def progress(pct, message): emit('progress', percent=pct, message=message)
            target, summary = generate_final_master_csv(audio, mapping, output, model, compute_type, device, None, int(threads), int(batch), progress)
            report = validate_master_csv(target)
            emit('result', csv_output=summary, report=report)
            return 0
        if command == 'validate-csv':
            report = validate_master_csv(argv[2])
            emit('result', report=report)
            return 0 if report['can_continue'] else 3
        if command == 'analyze-wfp':
            project = Path(argv[2]); csv_path = None if argv[3] == '-' else Path(argv[3]); image_folder = None if argv[4] == '-' else Path(argv[4])
            if csv_path: emit('progress', percent=8, message='Validating Final Master CSV')
            if csv_path:
                report = validate_master_csv(csv_path)
                emit('result', report=report)
                if not report['can_continue']: return 3
            emit('progress', percent=18, message='Analyzing Filmora WFP structure')
            def analysis_progress(pct, message):
                check_cancelled()
                emit('progress', percent=18 + max(0, min(100, float(pct))) * 0.78, message=message)
            analysis = legacy.analyze_wfp(project, csv_path, image_folder, progress_cb=analysis_progress)
            emit('progress', percent=100, message='Filmora project analysis complete')
            summary = {
                'project': str(project), 'timeline': analysis.timeline_name,
                'image_count': len(analysis.image_clips), 'marker_count': len(analysis.markers),
                'fps': analysis.fps, 'project_width': analysis.project_width,
                'project_height': analysis.project_height, 'audio_end_seconds': analysis.audio_end / legacy.TICKS_PER_SECOND,
                'warnings': analysis.warnings, 'errors': analysis.errors,
                'alignment_source': analysis.align_source,
                'planned_start_count': len(analysis.planned_starts)
            }
            emit('result', analysis=summary)
            return 0
        if command == 'export-wfp':
            payload = json.loads(argv[2])
            project = Path(payload['project']); csv_path = Path(payload['csv'])
            image_folder = Path(payload['imageFolder']) if payload.get('imageFolder') else None
            output = Path(payload['output'])
            presets = payload.get('presets', ['zoom_in', 'zoom_out', 'pan', 'pan_zoom'])
            allowed = {'zoom_in', 'zoom_out', 'pan', 'pan_zoom'}
            if not set(presets).issubset(allowed): raise ValueError('Unknown motion preset requested')
            report = validate_master_csv(csv_path)
            if not report['can_continue']: raise ValueError('CSV validation failed; export stopped')
            emit('progress', percent=3, message='Validating source WFP and CSV')
            def analysis_progress(pct, message):
                check_cancelled()
                emit('progress', percent=3 + max(0, min(100, float(pct))) * 0.27, message=message)
            analysis = legacy.analyze_wfp(project, csv_path, image_folder, progress_cb=analysis_progress)
            emit('progress', percent=32, message='WFP analysis passed; preparing motion assignments')
            if len(analysis.image_clips) != report['rows']:
                raise ValueError(f"Image clip count mismatch: WFP={len(analysis.image_clips)}, CSV={report['rows']}")
            def progress(pct, message):
                check_cancelled()
                emit('progress', percent=32 + max(0, min(100, float(pct))) * 0.66, message=message)
            result_path, qa = legacy.apply_and_export(
                analysis, output, presets, payload.get('mode', 'Balanced Random'),
                bool(payload.get('avoidRepeat', True)), int(payload.get('seed', 20261101)),
                payload.get('strength', 'Standard'), image_folder, progress
            )
            emit('progress', percent=100, message='Editable Filmora project exported and verified')
            emit('result', export={'output': str(result_path), 'qa': qa})
            return 0
        emit('error', message=f'Unknown command: {command}')
        return 2
    except ProcessingCancelled as exc:
        emit('cancelled', error_code='CANCELLED', message=str(exc))
        return 130
    except Exception as exc:
        error_code = 'OUTPUT_EXISTS' if isinstance(exc, FileExistsError) else 'ENGINE_ERROR'
        emit('error', error_code=error_code, message=str(exc), detail=traceback.format_exc(limit=5))
        return 1

if __name__ == '__main__': raise SystemExit(main(sys.argv))
