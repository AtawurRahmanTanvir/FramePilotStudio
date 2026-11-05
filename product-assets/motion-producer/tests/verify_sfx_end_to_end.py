#!/usr/bin/env python3
"""Comprehensive end-to-end verification of the 13 SFX families, WAV integrity,
deterministic seeds, differentiated waveforms, and Remotion ZIP integration.
"""
from __future__ import annotations

import importlib.util
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
import wave
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "claude-skill" / "framepilot-motion-producer"
SCRIPTS = SKILL / "scripts"
TOOLS = ROOT / "tools"
SAMPLE_PROJECT = ROOT / "examples" / "sample-remotion-project"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


sfx_gen = load_module("sfx_gen", SCRIPTS / "generate_sfx.py")
zip_val = load_module("zip_val", SCRIPTS / "validate_project_zip.py")


def verify_wav_file(path: Path, expected_channels: int, expected_rate: int = 48000) -> dict:
    with wave.open(str(path), "rb") as w:
        nchannels = w.getnchannels()
        sampwidth = w.getsampwidth()
        framerate = w.getframerate()
        nframes = w.getnframes()
        raw = w.readframes(nframes)

    assert nchannels == expected_channels, f"Expected {expected_channels} channels, got {nchannels}"
    assert sampwidth == 2, f"Expected 16-bit (2 bytes), got {sampwidth}"
    assert framerate == expected_rate, f"Expected {expected_rate} Hz, got {framerate}"
    assert nframes > 0, "File has 0 frames"

    total_samples = nframes * nchannels
    expected_bytes = total_samples * 2
    assert len(raw) == expected_bytes, f"Raw bytes {len(raw)} != expected {expected_bytes}"

    samples = struct.unpack(f"<{total_samples}h", raw)
    max_val = max(abs(s) for s in samples)
    peak_norm = max_val / 32767.0
    assert max_val <= 32767, f"Clipping detected: sample value {max_val} > 32767"

    # Zero-crossing rate (rough frequency characteristic)
    zero_crossings = sum(1 for i in range(1, len(samples)) if (samples[i] >= 0) != (samples[i - 1] >= 0))
    zcr = zero_crossings / len(samples)

    # RMS energy
    sum_sq = sum(float(s) * float(s) for s in samples)
    rms = math.sqrt(sum_sq / len(samples)) / 32767.0

    return {
        "channels": nchannels,
        "sample_rate": framerate,
        "frames": nframes,
        "duration_sec": round(nframes / framerate, 4),
        "peak": round(peak_norm, 4),
        "clipped": max_val > 32767,
        "zcr": round(zcr, 4),
        "rms": round(rms, 4),
        "file_size": path.stat().st_size,
    }


def run_sfx_verification():
    print("=" * 70)
    print("1. VERIFYING ALL 13 SFX FAMILIES (MONO & STEREO)")
    print("=" * 70)

    families = sorted(sfx_gen.FAMILIES.keys())
    assert len(families) == 13, f"Expected 13 families, found {len(families)}"

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        results = {}

        for fam in families:
            # 1. Test Mono
            mono_path = tmpdir / f"{fam}_mono.wav"
            mono_meta = sfx_gen.generate_effect(mono_path, fam, seed=10, channels=1, peak=0.82)
            mono_check = verify_wav_file(mono_path, expected_channels=1)

            # 2. Test Stereo
            stereo_path = tmpdir / f"{fam}_stereo.wav"
            stereo_meta = sfx_gen.generate_effect(stereo_path, fam, seed=10, channels=2, peak=0.82)
            stereo_check = verify_wav_file(stereo_path, expected_channels=2)

            results[fam] = {
                "mono": mono_check,
                "stereo": stereo_check,
            }

            print(f"[{fam:14}] duration: {mono_check['duration_sec']:.2f}s | mono peak: {mono_check['peak']:.3f} | stereo peak: {stereo_check['peak']:.3f} | ZCR: {mono_check['zcr']:.3f} | RMS: {mono_check['rms']:.3f}")

        # Verify waveform differentiation across families
        zcr_values = [results[f]["mono"]["zcr"] for f in families]
        durations = [results[f]["mono"]["duration_sec"] for f in families]
        rms_values = [results[f]["mono"]["rms"] for f in families]

        # Verify not all families have identical characteristics
        assert len(set(durations)) >= 8, "Families must have diverse durations"
        assert len(set(round(z, 2) for z in zcr_values)) >= 5, "Families must have diverse frequency profiles"

        print("\n" + "=" * 70)
        print("2. VERIFYING DETERMINISTIC SEED BEHAVIOR")
        print("=" * 70)

        seed_a1 = tmpdir / "whoosh_seed42_a.wav"
        seed_a2 = tmpdir / "whoosh_seed42_b.wav"
        seed_b = tmpdir / "whoosh_seed43.wav"

        sfx_gen.generate_effect(seed_a1, "whoosh", seed=42)
        sfx_gen.generate_effect(seed_a2, "whoosh", seed=42)
        sfx_gen.generate_effect(seed_b, "whoosh", seed=43)

        assert seed_a1.read_bytes() == seed_a2.read_bytes(), "Seed 42 did not produce identical WAV bytes"
        assert seed_a1.read_bytes() != seed_b.read_bytes(), "Different seeds produced identical WAV bytes"
        print("PASS: Same seed is bit-for-bit identical; different seeds differ.")

        print("\n" + "=" * 70)
        print("3. PACKAGING GENERATED SFX INTO A REAL REMOTION SAMPLE PROJECT")
        print("=" * 70)

        # Create a full sample project workspace with public/sfx populated
        test_proj = tmpdir / "remotion_sfx_project"
        shutil.copytree(SAMPLE_PROJECT, test_proj)

        sfx_dir = test_proj / "public" / "sfx"
        sfx_dir.mkdir(parents=True, exist_ok=True)

        manifest_assets = []
        for fam in families:
            sfx_file = sfx_dir / f"{fam}_cue.wav"
            meta = sfx_gen.generate_effect(sfx_file, fam, seed=1, channels=2, peak=0.80)
            manifest_assets.append(meta)

        # Write SFX_MANIFEST.json
        sfx_manifest_path = sfx_dir / "SFX_MANIFEST.json"
        sfx_manifest_path.write_text(json.dumps({
            "schemaVersion": "1.0",
            "assets": manifest_assets,
        }, indent=2), encoding="utf-8")

        # Update motion-project.json assets list
        manifest_path = test_proj / "motion-project.json"
        proj_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        proj_manifest["assets"] = [f"public/sfx/{fam}_cue.wav" for fam in families] + ["public/sfx/SFX_MANIFEST.json"]
        manifest_path.write_text(json.dumps(proj_manifest, indent=2), encoding="utf-8")

        # Package into ZIP
        out_zip = tmpdir / "FramePilot_Motion_Project_SFX_Verified.zip"
        pkg_script = SCRIPTS / "package_project_zip.py"
        res = subprocess.run([sys.executable, str(pkg_script), str(test_proj), str(out_zip)], capture_output=True, text=True)
        assert res.returncode == 0, f"Package failed: {res.stderr}"

        print(f"PASS: Created Remotion ZIP: {out_zip.name} ({out_zip.stat().st_size:,} bytes)")

        # Inspect ZIP contents
        with zipfile.ZipFile(out_zip, "r") as z:
            names = set(z.namelist())
            for fam in families:
                expected_wav = f"public/sfx/{fam}_cue.wav"
                assert expected_wav in names, f"ZIP missing {expected_wav}"
            assert "public/sfx/SFX_MANIFEST.json" in names, "ZIP missing SFX_MANIFEST.json"
            assert "motion-project.json" in names, "ZIP missing root motion-project.json"
            assert "package.json" in names, "ZIP missing root package.json"
            print(f"PASS: All 13 WAVs and SFX_MANIFEST.json present in ZIP ({len(names)} total files)")

        # Run project ZIP validator on it
        report = zip_val.validate_zip(str(out_zip))
        assert report["status"] == "PASS", f"ZIP validation failed: {report['errors']}"
        print("PASS: validate_project_zip reported status: PASS")

        # Run backend project_import.py inspect
        import_script = ROOT.parents[1] / "backend" / "motion" / "project_import.py"
        res_inspect = subprocess.run([sys.executable, str(import_script), "inspect", str(out_zip)], capture_output=True, text=True)
        assert res_inspect.returncode == 0, f"project_import.py inspect failed: {res_inspect.stderr}"
        inspect_data = json.loads(res_inspect.stdout.strip())
        assert inspect_data.get("event") == "result", f"Unexpected event: {inspect_data}"
        print("PASS: project_import.py inspect returned event: result (success)")

    print("\n" + "=" * 70)
    print("ALL SFX END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(run_sfx_verification())
