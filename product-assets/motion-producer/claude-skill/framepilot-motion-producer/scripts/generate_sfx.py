#!/usr/bin/env python3
"""Generate deterministic, original PCM WAV sound effects for a Motion project.

The generator deliberately uses only the Python standard library. It creates
short design assets, not recordings or claims of authentic historical audio.
Supports 13 distinct procedural effect families, mono and stereo synthesis,
noise shaping, multi-layer envelopes, and precise peak control without clipping.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import wave
from pathlib import Path

DEFAULT_SAMPLE_RATE = 48_000

# Base parameters: (default_duration_sec, start_freq_hz, end_freq_hz)
FAMILIES = {
    "whoosh": (0.65, 180.0, 1200.0),
    "transition": (0.45, 240.0, 900.0),
    "impact": (0.35, 90.0, 55.0),
    "hit": (0.55, 62.0, 38.0),
    "riser": (1.20, 120.0, 1600.0),
    "reverse-sweep": (0.90, 900.0, 130.0),
    "click": (0.12, 1600.0, 1600.0),
    "metallic": (0.50, 720.0, 330.0),
    "shutter": (0.18, 2200.0, 2200.0),
    "paper": (0.60, 2500.0, 1100.0),
    "ui-tone": (0.20, 880.0, 880.0),
    "ambience": (2.00, 180.0, 260.0),
    "reveal": (0.80, 160.0, 950.0),
}


def _envelope(family: str, pos: float, duration: float) -> float:
    """Compute amplitude envelope shaped for the specific sound family."""
    if pos < 0.0 or pos > 1.0:
        return 0.0

    if family in {"impact", "hit"}:
        # Ultra fast attack (2-4ms), exponential decay
        attack = min(1.0, pos / max(0.005, 0.004 / duration))
        decay = math.exp(-pos * (7.0 if family == "impact" else 4.8))
        return attack * decay

    if family in {"click", "shutter"}:
        if family == "shutter":
            # Dual-impulse curtain: click at pos ~ 0.05 and click at pos ~ 0.55
            impulse1 = math.exp(-abs(pos - 0.08) * 45.0) if pos < 0.35 else 0.0
            impulse2 = math.exp(-abs(pos - 0.52) * 40.0) if pos >= 0.35 else 0.0
            return max(0.0, impulse1 * 0.9 + impulse2 * 0.75)
        # Mechanical click: extremely snappy 10-15ms burst
        return math.exp(-pos * 24.0)

    if family == "riser":
        # Exponential buildup to climax with small pre-tail
        return math.pow(pos, 2.2)

    if family == "reverse-sweep":
        # Builds up from silence to peak at pos=0.88 then drops sharply
        if pos < 0.88:
            return math.pow(pos / 0.88, 2.5)
        return max(0.0, 1.0 - (pos - 0.88) / 0.12)

    if family == "whoosh":
        # Symmetrical smooth arc peaked around 55%
        attack = math.sin(min(1.0, pos / 0.55) * math.pi * 0.5)
        release = math.cos(max(0.0, (pos - 0.55) / 0.45) * math.pi * 0.5)
        return attack * release

    if family == "transition":
        # Soft Gaussian bell curve
        diff = (pos - 0.45) / 0.28
        return math.exp(-0.5 * diff * diff)

    if family == "metallic":
        # Fast strike followed by multiple ringing resonances
        attack = min(1.0, pos / 0.015)
        decay = math.exp(-pos * 5.5)
        return attack * decay

    if family == "paper":
        # Shuffling modulation envelope
        base = math.sin(pos * math.pi)
        shimmer = 0.7 + 0.3 * math.sin(pos * 38.0)
        return max(0.0, base * shimmer)

    if family == "ui-tone":
        # Crisp musical chime: 5ms attack, smooth exponential decay
        attack = min(1.0, pos / 0.03)
        decay = math.exp(-pos * 6.2)
        return attack * decay

    if family == "reveal":
        # Smooth cinematic swell: slow attack, warm sustain, gentle release
        if pos < 0.65:
            return math.pow(pos / 0.65, 1.8)
        return math.cos((pos - 0.65) / 0.35 * math.pi * 0.5)

    if family == "ambience":
        # Atmospheric bed with gentle fade-in and fade-out
        fade_in = min(1.0, pos / 0.25)
        fade_out = min(1.0, (1.0 - pos) / 0.25)
        return fade_in * fade_out * (0.85 + 0.15 * math.sin(pos * 12.0))

    # Generic fallback envelope
    attack = min(1.0, pos / 0.12)
    release = min(1.0, (1.0 - pos) / 0.18)
    return max(0.0, min(attack, release))


def _synthesize_sample(
    family: str,
    pos: float,
    duration: float,
    channel: int,
    rng: random.Random,
    prev_state: list[float],
) -> float:
    """Generate a single sample with multi-layer synthesis tailored to family."""
    duration_spec, start_freq, end_freq = FAMILIES[family]

    # Stereo modulation / phase shift
    phase_offset = 0.08 * math.pi if channel == 1 else 0.0
    pan_drift = 0.15 * math.sin(pos * math.pi) * (1.0 if channel == 0 else -1.0)

    # Filtered noise generator (pink-like two-pole integrator)
    white = rng.uniform(-1.0, 1.0)
    prev_noise = prev_state[channel]
    noise_filter_coeff = 0.18 if family in {"paper", "whoosh"} else 0.08
    filtered_noise = prev_noise + noise_filter_coeff * (white - prev_noise)
    prev_state[channel] = filtered_noise

    # Frequency path
    if family == "riser":
        # Exponential pitch curve
        freq = start_freq * math.pow(end_freq / start_freq, pos)
    elif family == "reverse-sweep":
        freq = start_freq * math.pow(end_freq / start_freq, pos)
    else:
        freq = start_freq + (end_freq - start_freq) * pos

    phase = 2.0 * math.pi * freq * pos * duration + phase_offset

    signal = 0.0

    if family == "whoosh":
        # Dynamic whoosh: lowpass noise swept + resonant core tone
        core_tone = math.sin(phase) * 0.35 + math.sin(phase * 1.5) * 0.15
        noise_part = filtered_noise * (0.65 + 0.25 * math.sin(pos * math.pi))
        signal = core_tone + noise_part

    elif family == "transition":
        # Soft harmonic glide + gentle noise
        tone = math.sin(phase) * 0.6 + math.sin(phase * 2.0) * 0.25
        signal = tone * 0.8 + filtered_noise * 0.2

    elif family == "impact":
        # Sub-bass punch dropping from 90Hz to 40Hz + click transient
        sub_phase = 2.0 * math.pi * (45.0 + 45.0 * math.exp(-pos * 18.0)) * pos * duration + phase_offset
        sub_punch = math.sin(sub_phase) * 0.75
        body = math.sin(phase) * 0.3
        transient = filtered_noise * math.exp(-pos * 40.0) * 0.4
        signal = sub_punch + body + transient

    elif family == "hit":
        # Low rumble hit (38-60 Hz) with deep harmonic warmth
        sub_phase = 2.0 * math.pi * (34.0 + 28.0 * math.exp(-pos * 12.0)) * pos * duration + phase_offset
        sub = math.sin(sub_phase) * 0.8
        rumble = math.sin(sub_phase * 0.5) * 0.3 + filtered_noise * 0.15 * math.exp(-pos * 6.0)
        signal = sub + rumble

    elif family == "riser":
        # Multi-oscillator detuned harmonic riser + noise hiss
        osc1 = math.sin(phase) * 0.4
        osc2 = math.sin(phase * 1.015) * 0.3
        osc3 = math.sin(phase * 2.0) * 0.15
        hiss = filtered_noise * math.pow(pos, 1.8) * 0.35
        signal = osc1 + osc2 + osc3 + hiss

    elif family == "reverse-sweep":
        # Reverse whoosh tone + backwards suction noise
        sweep_tone = math.sin(phase) * 0.5 + math.sin(phase * 2.02) * 0.2
        suck_noise = filtered_noise * math.pow(pos, 2.0) * 0.45
        signal = sweep_tone + suck_noise

    elif family == "click":
        # Mechanical snap: resonant bandpass spike + rapid burst
        snap = math.sin(phase) * 0.75 + filtered_noise * 0.4
        signal = snap

    elif family == "metallic":
        # Ringing inharmonic metal chime (Bell modes)
        m1 = math.sin(phase) * 0.45 * math.exp(-pos * 4.0)
        m2 = math.sin(phase * 1.78) * 0.30 * math.exp(-pos * 6.0)
        m3 = math.sin(phase * 2.52) * 0.20 * math.exp(-pos * 7.5)
        m4 = math.sin(phase * 3.41) * 0.15 * math.exp(-pos * 9.0)
        signal = m1 + m2 + m3 + m4 + filtered_noise * 0.1 * math.exp(-pos * 20.0)

    elif family == "shutter":
        # Camera shutter click-clack
        click_tone = math.sin(phase) * 0.6 + filtered_noise * 0.5
        signal = click_tone

    elif family == "paper":
        # Paper slide / document handling texture: pure modulated friction noise
        rustle = filtered_noise * 0.85 + math.sin(phase) * 0.15
        signal = rustle

    elif family == "ui-tone":
        # Crisp harmonic triad (root, 5th, octave)
        root = math.sin(phase) * 0.55
        fifth = math.sin(phase * 1.498) * 0.28
        octave = math.sin(phase * 2.0) * 0.17
        signal = root + fifth + octave

    elif family == "ambience":
        # Deep cinematic atmospheric drone bed
        drone1 = math.sin(phase) * 0.45
        drone2 = math.sin(phase * 1.503 + phase_offset) * 0.30
        drone3 = math.sin(phase * 0.5) * 0.20
        texture = filtered_noise * 0.12
        signal = drone1 + drone2 + drone3 + texture

    elif family == "reveal":
        # Cinematic reveal chord swell (root, fifth, 9th)
        c1 = math.sin(phase) * 0.45
        c2 = math.sin(phase * 1.502) * 0.30
        c3 = math.sin(phase * 2.25) * 0.18
        air = filtered_noise * 0.12 * min(1.0, pos * 1.5)
        signal = c1 + c2 + c3 + air

    env = _envelope(family, pos, duration)
    return (signal + pan_drift) * env


def generate_effect(
    output: Path,
    family: str,
    seed: int = 0,
    peak: float = 0.82,
    duration: float | None = None,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
    channels: int = 1,
) -> dict:
    """Generate an audio effect WAV file with verified metadata."""
    if family not in FAMILIES:
        raise ValueError(f"Unknown effect family '{family}'. Supported: {', '.join(sorted(FAMILIES))}")
    if channels not in (1, 2):
        raise ValueError("channels must be 1 (mono) or 2 (stereo)")
    if sample_rate < 8000 or sample_rate > 192000:
        raise ValueError("sample_rate must be between 8000 and 192000 Hz")

    effective_duration = float(duration) if duration is not None and duration > 0 else FAMILIES[family][0]
    total_frames = max(1, round(effective_duration * sample_rate))

    rng = random.Random(seed)
    prev_noise = [0.0, 0.0]

    # Synthesize channels
    channel_samples: list[list[float]] = [[] for _ in range(channels)]
    for ch in range(channels):
        # Reset seed per channel so mono matches stereo ch0 deterministically
        ch_rng = random.Random(seed + ch * 1000)
        for frame_idx in range(total_frames):
            pos = frame_idx / max(1, total_frames - 1)
            val = _synthesize_sample(family, pos, effective_duration, ch, ch_rng, prev_noise)
            channel_samples[ch].append(val)

    # Measure maximum peak across all samples
    max_abs = 1e-9
    for ch in range(channels):
        for s in channel_samples[ch]:
            if abs(s) > max_abs:
                max_abs = abs(s)

    # Scale to desired peak without clipping
    target_peak = max(0.01, min(0.99, float(peak)))
    scale = target_peak / max_abs

    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as handle:
        handle.setnchannels(channels)
        handle.setsampwidth(2)  # 16-bit PCM
        handle.setframerate(sample_rate)

        raw_frames = bytearray()
        for frame_idx in range(total_frames):
            for ch in range(channels):
                val = channel_samples[ch][frame_idx] * scale
                # Strict clamping to avoid 16-bit signed integer overflow
                int_val = int(max(-32767.0, min(32767.0, val * 32767.0)))
                raw_frames.extend(int_val.to_bytes(2, "little", signed=True))
        handle.writeframes(raw_frames)

    actual_file_size = output.stat().st_size
    measured_peak = round(max_abs * scale, 4)

    return {
        "assetId": output.stem,
        "family": family,
        "path": output.name,
        "sampleRate": sample_rate,
        "channels": channels,
        "durationMs": round(effective_duration * 1000),
        "peak": measured_peak,
        "seed": seed,
        "fileSizeBytes": actual_file_size,
        "generatedBy": "FramePilot Motion Producer procedural SFX generator",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir", type=Path, help="Directory to save generated WAV files")
    parser.add_argument("--family", choices=sorted(FAMILIES), default="whoosh", help="Sound effect family")
    parser.add_argument("--seed", type=int, default=0, help="Deterministic random seed")
    parser.add_argument("--duration", type=float, default=None, help="Custom duration in seconds")
    parser.add_argument("--sample-rate", type=int, default=DEFAULT_SAMPLE_RATE, help="Sample rate in Hz (default: 48000)")
    parser.add_argument("--channels", type=int, choices=[1, 2], default=1, help="Channels: 1 (mono) or 2 (stereo)")
    parser.add_argument("--peak", type=float, default=0.82, help="Peak target amplitude (0.01 to 0.99)")
    parser.add_argument("--manifest", type=Path, default=None, help="Path to SFX_MANIFEST.json")
    parser.add_argument("--name", type=str, default=None, help="Custom output filename (e.g. whoosh_01.wav)")
    parser.add_argument("--all", action="store_true", help="Generate one effect for every supported family")
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.manifest or (args.output_dir / "SFX_MANIFEST.json")

    existing_assets: list[dict] = []
    if manifest_path.is_file():
        try:
            existing_assets = json.loads(manifest_path.read_text(encoding="utf-8")).get("assets", [])
        except Exception:
            existing_assets = []

    generated_assets: list[dict] = []

    if args.all:
        for fam in sorted(FAMILIES):
            filename = f"{fam}_{args.seed}.wav"
            output_file = args.output_dir / filename
            meta = generate_effect(
                output_file,
                fam,
                seed=args.seed,
                peak=args.peak,
                duration=args.duration,
                sample_rate=args.sample_rate,
                channels=args.channels,
            )
            generated_assets.append(meta)
    else:
        filename = args.name or f"{args.family}_{args.seed}.wav"
        if not filename.endswith(".wav"):
            filename += ".wav"
        output_file = args.output_dir / filename
        meta = generate_effect(
            output_file,
            args.family,
            seed=args.seed,
            peak=args.peak,
            duration=args.duration,
            sample_rate=args.sample_rate,
            channels=args.channels,
        )
        generated_assets.append(meta)

    # Merge into manifest
    gen_paths = {a["path"] for a in generated_assets}
    merged = [item for item in existing_assets if item.get("path") not in gen_paths] + generated_assets
    manifest_payload = {
        "schemaVersion": "1.0",
        "generatedBy": "FramePilot Motion Producer SFX Generator",
        "sampleRate": args.sample_rate,
        "assets": merged,
    }
    manifest_path.write_text(json.dumps(manifest_payload, indent=2) + "\n", encoding="utf-8")

    for meta in generated_assets:
        print(json.dumps(meta, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
