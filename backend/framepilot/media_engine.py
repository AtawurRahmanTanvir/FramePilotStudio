from __future__ import annotations

import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Any, Callable


class MediaEngineError(RuntimeError):
    pass


class ProcessingCancelled(RuntimeError):
    pass


def check_cancelled() -> None:
    marker = os.environ.get('FRAMEPILOT_CANCEL_FILE')
    if marker and Path(marker).is_file():
        raise ProcessingCancelled('Processing was cancelled by the user.')


def _binary_names(name: str) -> tuple[str, ...]:
    return (f'{name}.exe', name) if os.name == 'nt' else (name,)


def resolve_binary(name: str) -> str:
    """Resolve only application-owned engine binaries; never depend on PATH."""
    runtime_root = Path(
        os.environ.get('FRAMEPILOT_RUNTIME_ROOT')
        or Path(__file__).resolve().parents[2] / 'runtime'
    ).resolve()
    candidates: list[Path] = [runtime_root / 'ffmpeg']
    if os.environ.get('FRAMEPILOT_DEV_MODE') == '1':
        vendor_root = Path(
            os.environ.get('FRAMEPILOT_VENDOR_ROOT')
            or Path(__file__).resolve().parents[2] / 'vendor'
        ).resolve()
        candidates.append(vendor_root / 'ffmpeg')
    for directory in candidates:
        for candidate in _binary_names(name):
            path = directory / candidate
            if path.is_file():
                return str(path)
    expected = ', '.join(str(directory / _binary_names(name)[0]) for directory in candidates)
    raise MediaEngineError(
        f'Application-owned {name} executable is missing. Checked: {expected}. '
        'The application will not use a global PATH installation.'
    )


def _run_capture(command: list[str], label: str) -> subprocess.CompletedProcess[str]:
    check_cancelled()
    try:
        return subprocess.run(
            command, capture_output=True, text=True, encoding='utf-8',
            errors='replace', check=False,
        )
    except OSError as exc:
        raise MediaEngineError(f'Could not start {label}: {exc}') from exc


def probe_media(path: str | Path) -> dict[str, Any]:
    source = Path(path).expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f'Media file not found: {source}')
    ffprobe = resolve_binary('ffprobe')
    proc = _run_capture([
        ffprobe, '-v', 'error', '-show_entries',
        'format=duration,format_name:stream=codec_type,codec_name,sample_rate,channels,duration',
        '-of', 'json', str(source),
    ], 'FFprobe')
    if proc.returncode:
        raise MediaEngineError(f'FFprobe could not inspect media: {proc.stderr.strip()}')
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise MediaEngineError('FFprobe returned malformed metadata.') from exc
    streams = data.get('streams') or []
    audio_streams = [stream for stream in streams if stream.get('codec_type') == 'audio']
    if not audio_streams:
        raise MediaEngineError('Selected file contains no audio stream.')
    fmt = data.get('format') or {}
    duration_raw = audio_streams[0].get('duration') or fmt.get('duration')
    try:
        duration = float(duration_raw)
    except (TypeError, ValueError):
        duration = None
    if duration is not None and duration <= 0:
        raise MediaEngineError('Selected media has an invalid or zero audio duration.')
    return {
        'path': str(source), 'duration_seconds': duration,
        'format_name': fmt.get('format_name'),
        'audio_streams': len(audio_streams),
        'codec': audio_streams[0].get('codec_name'),
        'sample_rate': audio_streams[0].get('sample_rate'),
        'channels': audio_streams[0].get('channels'),
    }


def normalize_audio_for_asr(
    source: str | Path,
    output_wav: str | Path,
    progress: Callable[[float, str], None] | None = None,
) -> dict[str, Any]:
    source = Path(source).expanduser().resolve()
    output = Path(output_wav).expanduser().resolve()
    info = probe_media(source)
    ffmpeg = resolve_binary('ffmpeg')
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise MediaEngineError(f'Refusing to overwrite an existing temporary WAV: {output}')
    command = [
        ffmpeg, '-n', '-nostdin', '-hide_banner', '-loglevel', 'error',
        '-i', str(source), '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000',
        '-c:a', 'pcm_s16le', '-f', 'wav', '-progress', 'pipe:1', '-nostats', str(output),
    ]
    try:
        proc = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            encoding='utf-8', errors='replace', bufsize=1,
        )
    except OSError as exc:
        raise MediaEngineError(f'Could not start application-owned FFmpeg: {exc}') from exc

    stderr_tail = ['']

    def drain_stderr() -> None:
        if proc.stderr is None:
            return
        for chunk in iter(lambda: proc.stderr.read(4096), ''):
            stderr_tail[0] = (stderr_tail[0] + chunk)[-12000:]

    stderr_reader = threading.Thread(target=drain_stderr, name='framepilot-ffmpeg-stderr', daemon=True)
    stderr_reader.start()
    duration = info.get('duration_seconds') or 0.0
    last_percent = -1
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            check_cancelled()
            key, _, value = line.strip().partition('=')
            if key == 'out_time_ms' and duration > 0:
                try:
                    percent = max(0.0, min(100.0, (int(value) / 1_000_000.0) / duration * 100.0))
                    rounded = int(percent)
                    if progress and rounded != last_percent:
                        last_percent = rounded
                        progress(percent, 'Converting source audio to 16 kHz mono WAV')
                except ValueError:
                    pass
        check_cancelled()
        return_code = proc.wait()
        stderr_reader.join(timeout=2)
    except ProcessingCancelled:
        proc.kill()
        proc.wait()
        output.unlink(missing_ok=True)
        raise
    except Exception:
        proc.kill()
        proc.wait()
        output.unlink(missing_ok=True)
        raise
    if return_code:
        output.unlink(missing_ok=True)
        raise MediaEngineError(
            f'FFmpeg audio normalization failed: {stderr_tail[0].strip() or f"exit code {return_code}"}'
        )
    if not output.is_file() or output.stat().st_size < 44:
        output.unlink(missing_ok=True)
        raise MediaEngineError('FFmpeg did not create a valid normalized WAV file.')
    if progress:
        progress(100.0, 'Audio normalization complete')
    return {
        **info, 'normalized_wav': str(output),
        'normalized_sample_rate': 16000, 'normalized_channels': 1,
    }
