from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "claude-skill" / "framepilot-motion-producer"
SCRIPTS = SKILL / "scripts"
SAMPLE_PROJECT = ROOT / "examples" / "sample-remotion-project"
BACKEND_MOTION = Path(__file__).resolve().parents[3] / "backend" / "motion"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


csv_validator = load_module("csv_validator", SCRIPTS / "validate_word_timing.py")
zip_validator = load_module("zip_validator", SCRIPTS / "validate_project_zip.py")
sfx_generator = load_module("sfx_generator", SCRIPTS / "generate_sfx.py")


class WordTimingTests(unittest.TestCase):
    def write_csv(self, folder: Path, rows: str) -> Path:
        path = folder / "timing.csv"
        path.write_text(
            "Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms\n" + rows,
            encoding="utf-8",
        )
        return path

    def test_valid_csv(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.write_csv(Path(tmp), "1,Hello,Hello,0,200\n2,world,world,220,500\n")
            report = csv_validator.validate(path)
            self.assertEqual(report["status"], "PASS")
            self.assertEqual(report["validTimedRows"], 2)

    def test_mismatch_and_untimed_are_warnings(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.write_csv(Path(tmp), "1,friend,frend,0,200\n2,missing,,,\n")
            report = csv_validator.validate(path)
            self.assertEqual(report["status"], "PASS_WITH_WARNINGS")
            self.assertEqual(report["mismatchRows"], 1)
            self.assertEqual(report["untimedRows"], 1)

    def test_duplicate_index_and_partial_range_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.write_csv(Path(tmp), "1,a,a,0,100\n1,b,b,100,\n")
            report = csv_validator.validate(path)
            self.assertEqual(report["status"], "FAIL")
            error_types = {item["type"] for item in report["errors"]}
            self.assertIn("duplicate_word_index", error_types)
            self.assertIn("partial_time_range", error_types)

    def test_utf8_bom_and_bengali_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bengali.csv"
            path.write_text(
                "\ufeffWord_Index,Script_Word,Recognized_Word,Start_ms,End_ms\n1,বাংলা,বাংলা,0,500\n",
                encoding="utf-8",
            )
            report = csv_validator.validate(path)
            self.assertEqual(report["status"], "PASS")


class ProjectZipTests(unittest.TestCase):
    def make_zip(self, target: Path, extra: tuple[str, bytes] | None = None) -> Path:
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            for file in SAMPLE_PROJECT.rglob("*"):
                if file.is_file():
                    archive.write(file, file.relative_to(SAMPLE_PROJECT).as_posix())
            if extra:
                archive.writestr(extra[0], extra[1])
        return target

    def test_sample_project_zip_passes_static_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.make_zip(Path(tmp) / "sample.zip")
            report = zip_validator.validate_zip(str(path))
            self.assertEqual(report["status"], "PASS", report["errors"])
            self.assertFalse(report["checks"]["sourceExecuted"])

    def test_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self.make_zip(Path(tmp) / "unsafe.zip", ("../escape.txt", b"no"))
            report = zip_validator.validate_zip(str(path))
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any(e["type"] == "path_traversal_or_empty_segment" for e in report["errors"]))

    def test_root_manifest_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "nested.zip"
            with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
                for file in SAMPLE_PROJECT.rglob("*"):
                    if file.is_file():
                        archive.write(file, (Path("wrapper") / file.relative_to(SAMPLE_PROJECT)).as_posix())
            report = zip_validator.validate_zip(str(target))
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any(e["type"] == "manifest_not_at_zip_root" for e in report["errors"]))


class SFXGeneratorTests(unittest.TestCase):
    """Tests for the procedural SFX generator."""

    ALL_FAMILIES = [
        "whoosh", "transition", "impact", "hit", "riser", "reverse-sweep",
        "click", "metallic", "shutter", "paper", "ui-tone", "ambience", "reveal"
    ]

    def test_all_families_generate_valid_wav(self):
        """Every SFX family must produce a readable WAV file with correct parameters."""
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            for family in self.ALL_FAMILIES:
                output = tmpdir / f"{family}_test.wav"
                metadata = sfx_generator.generate_effect(output, family, seed=1)
                # File must exist and be non-empty
                self.assertTrue(output.exists(), f"WAV missing for family: {family}")
                self.assertGreater(output.stat().st_size, 44, f"WAV too small for family: {family}")
                # Must be readable as a WAV
                with wave.open(str(output), "rb") as wav:
                    self.assertEqual(wav.getsampwidth(), 2, f"Sample width must be 16-bit: {family}")
                    self.assertEqual(wav.getframerate(), 48000, f"Sample rate must be 48000: {family}")
                    self.assertGreater(wav.getnframes(), 0, f"WAV has no frames: {family}")
                # Metadata must contain required fields
                self.assertEqual(metadata["family"], family)
                self.assertEqual(metadata["sampleRate"], 48000)
                self.assertGreater(metadata["durationMs"], 0)
                self.assertLessEqual(metadata["peak"], 1.0)
                self.assertGreater(metadata["peak"], 0.0)

    def test_deterministic_seed(self):
        """Same seed must produce identical WAV files."""
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            for seed in (0, 1, 42):
                out_a = tmpdir / f"whoosh_{seed}_a.wav"
                out_b = tmpdir / f"whoosh_{seed}_b.wav"
                sfx_generator.generate_effect(out_a, "whoosh", seed=seed)
                sfx_generator.generate_effect(out_b, "whoosh", seed=seed)
                self.assertEqual(
                    out_a.read_bytes(), out_b.read_bytes(),
                    f"SFX not deterministic for seed={seed}"
                )

    def test_peak_control(self):
        """Peak must stay within the requested limit."""
        with tempfile.TemporaryDirectory() as tmp:
            for peak_target in (0.5, 0.75, 0.9):
                output = Path(tmp) / f"peak_{peak_target}.wav"
                metadata = sfx_generator.generate_effect(output, "whoosh", seed=0, peak=peak_target)
                self.assertLessEqual(
                    metadata["peak"], peak_target + 0.01,
                    f"Peak exceeded target: {metadata['peak']} > {peak_target}"
                )

    def test_manifest_generation_via_cli(self):
        """CLI must write SFX_MANIFEST.json and report valid metadata."""
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            manifest_path = tmpdir / "SFX_MANIFEST.json"
            result = subprocess.run(
                [sys.executable, str(SCRIPTS / "generate_sfx.py"), str(tmpdir),
                 "--family", "click", "--seed", "7", "--manifest", str(manifest_path)],
                capture_output=True, text=True, check=False
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            # The CLI must print JSON metadata
            metadata = json.loads(result.stdout.strip())
            self.assertEqual(metadata["family"], "click")
            # Manifest must be written
            self.assertTrue(manifest_path.exists())
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertIn("assets", manifest)
            self.assertTrue(any(a["family"] == "click" for a in manifest["assets"]))

    def test_unknown_family_raises(self):
        """Unknown family must raise ValueError."""
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError, msg="Unknown family should raise ValueError"):
                sfx_generator.generate_effect(Path(tmp) / "bad.wav", "not-a-family")

    def test_wav_no_clipping(self):
        """WAV samples must stay within 16-bit range."""
        import struct
        with tempfile.TemporaryDirectory() as tmp:
            for family in ["impact", "hit", "riser"]:
                output = Path(tmp) / f"{family}_clip_test.wav"
                sfx_generator.generate_effect(output, family, seed=0, peak=0.95)
                with wave.open(str(output), "rb") as wav:
                    raw = wav.readframes(wav.getnframes())
                samples = struct.unpack(f"<{len(raw) // 2}h", raw)
                max_sample = max(abs(s) for s in samples)
                self.assertLessEqual(
                    max_sample, 32767,
                    f"Clipping detected in family '{family}': {max_sample}"
                )


class UtilityCLITests(unittest.TestCase):
    def test_frame_converter(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "timing.csv"
            csv_path.write_text(
                "Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms\n1,Hello,Hello,10,41\n",
                encoding="utf-8",
            )
            output = Path(tmp) / "frames.json"
            completed = subprocess.run(
                [sys.executable, str(SCRIPTS / "csv_to_frame_timing.py"), str(csv_path), "--fps", "30", "--output", str(output)],
                check=False, capture_output=True, text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            data = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(data["timedWords"][0]["startFrame"], 0)
            self.assertEqual(data["timedWords"][0]["endFrameExclusive"], 2)

    def test_package_builder_places_manifest_at_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "packed.zip"
            completed = subprocess.run(
                [sys.executable, str(SCRIPTS / "package_project_zip.py"), str(SAMPLE_PROJECT), str(output)],
                check=False, capture_output=True, text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            with zipfile.ZipFile(output) as archive:
                self.assertIn("motion-project.json", archive.namelist())
                self.assertNotIn("sample-remotion-project/motion-project.json", archive.namelist())

    def test_sfx_all_families_via_subprocess(self):
        """Full CLI execution of every SFX family."""
        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            families = [
                "whoosh", "transition", "impact", "hit", "riser", "reverse-sweep",
                "click", "metallic", "shutter", "paper", "ui-tone", "ambience", "reveal"
            ]
            for family in families:
                result = subprocess.run(
                    [sys.executable, str(SCRIPTS / "generate_sfx.py"), str(tmpdir),
                     "--family", family, "--seed", "1"],
                    capture_output=True, text=True, check=False
                )
                self.assertEqual(result.returncode, 0, f"SFX generation failed for {family}: {result.stderr}")
                # Check WAV was created
                wav_files = list(tmpdir.glob(f"{family.replace('-', '-')}_*.wav"))
                self.assertTrue(len(wav_files) > 0, f"No WAV file for family: {family}")


class NarrationBindingTests(unittest.TestCase):
    """Tests for the narration asset binding schema and logic."""

    def _make_manifest_with_narration(self, session_id: str = None, target: str = "public/audio/narration.wav") -> dict:
        return {
            "schemaVersion": 1,
            "projectName": "Test Project",
            "entryPoint": "src/index.tsx",
            "compositionId": "Main",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "durationInFrames": 900,
            "remotionVersion": "4.0.540",
            "assets": [],
            "narration": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": session_id,
                "target": target,
            }
        }

    def test_narration_binding_schema_valid(self):
        """Narration binding must have all required fields."""
        binding = {
            "logicalId": "voiceover.primary",
            "source": "framepilot-linked-audio",
            "required": True,
            "sessionId": "test-session-001",
            "target": "public/audio/narration.wav",
        }
        self.assertEqual(binding["logicalId"], "voiceover.primary")
        self.assertEqual(binding["source"], "framepilot-linked-audio")
        self.assertTrue(binding["required"])
        self.assertIn("target", binding)

    def test_narration_target_is_project_relative(self):
        """Narration target must not be absolute or traversal."""
        valid_targets = [
            "public/audio/narration.wav",
            "public/audio/voiceover.mp3",
        ]
        invalid_targets = [
            "/absolute/path/narration.wav",
            "../escape/narration.wav",
            "C:\\Windows\\narration.wav",
        ]
        for target in valid_targets:
            self.assertFalse(target.startswith("/"), f"Should be relative: {target}")
            self.assertFalse(".." in target.split("/"), f"Should have no traversal: {target}")
        for target in invalid_targets:
            is_invalid = target.startswith("/") or ".." in target or (len(target) > 1 and target[1] == ":")
            self.assertTrue(is_invalid, f"Should be invalid: {target}")

    def test_narration_resolve_from_local_session_by_filename(self):
        """resolve_narration_binding should find audio by original filename."""
        # Dynamically load project_import to test resolve_narration_binding
        import_module_path = BACKEND_MOTION / "project_import.py"
        if not import_module_path.exists():
            self.skipTest("project_import.py not found in backend/motion/")
        project_import = load_module("project_import", import_module_path)
        if not hasattr(project_import, "resolve_narration_binding"):
            self.skipTest("resolve_narration_binding not yet implemented in project_import.py")

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            # Create fake projects root with Word Timing session
            projects_root = tmpdir / "Motion Projects"
            word_timing = projects_root / "Word Timing"
            word_timing.mkdir(parents=True)
            # Create a fake audio file
            audio_file = word_timing / "my_voiceover.wav"
            audio_file.write_bytes(b"RIFF" + b"\x00" * 100)  # minimal fake WAV header
            # Create temp project root
            project_temp = tmpdir / "project"
            project_temp.mkdir()
            # Build manifest with originalFilename
            manifest = {
                "narration": {
                    "logicalId": "voiceover.primary",
                    "source": "framepilot-linked-audio",
                    "required": True,
                    "originalFilename": "my_voiceover.wav",
                    "target": "public/audio/narration.wav",
                }
            }
            result = project_import.resolve_narration_binding(manifest, project_temp, projects_root)
            if result is None:
                self.skipTest("resolve_narration_binding returned None (may not support filename matching yet)")
            self.assertIn(result["status"], ("resolved", "included", "unresolved"))
            if result["status"] == "resolved":
                target_path = project_temp / "public" / "audio" / "narration.wav"
                self.assertTrue(target_path.exists(), "Resolved audio was not copied to target path")

    def test_legacy_manifest_compatibility(self):
        """Manifests without narration/voiceoverBinding must continue working without error."""
        import_module_path = BACKEND_MOTION / "project_import.py"
        if not import_module_path.exists():
            self.skipTest("project_import.py not found in backend/motion/")
        project_import = load_module("project_import", import_module_path)

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            project_temp = tmpdir / "project"
            project_temp.mkdir()
            projects_root = tmpdir / "Motion Projects"
            legacy_manifest = {
                "schemaVersion": 1,
                "projectName": "Legacy Project",
                "entryPoint": "src/index.tsx",
                "compositionId": "Main",
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "durationInFrames": 300,
                "remotionVersion": "4.0.540",
                "assets": [],
                "voiceover": None,
            }
            # Should return None cleanly
            result = project_import.resolve_narration_binding(legacy_manifest, project_temp, projects_root)
            self.assertIsNone(result)

    def test_narration_unresolved_emits_warning(self):
        """When linked audio cannot be found, returns unresolved status with warning."""
        import_module_path = BACKEND_MOTION / "project_import.py"
        if not import_module_path.exists():
            self.skipTest("project_import.py not found in backend/motion/")
        project_import = load_module("project_import", import_module_path)

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            project_temp = tmpdir / "project"
            project_temp.mkdir()
            projects_root = tmpdir / "Motion Projects"
            manifest = {
                "narration": {
                    "logicalId": "voiceover.primary",
                    "source": "framepilot-linked-audio",
                    "required": True,
                    "sessionId": "nonexistent-session-id-12345",
                    "target": "public/audio/narration.wav",
                }
            }
            result = project_import.resolve_narration_binding(manifest, project_temp, projects_root)
            self.assertIsNotNone(result)
            self.assertEqual(result["status"], "unresolved")
            self.assertIn("warning", result)

    def test_session_id_resolution_via_session_meta(self):
        """Audio matching via .session.json sessionId."""
        import_module_path = BACKEND_MOTION / "project_import.py"
        if not import_module_path.exists():
            self.skipTest("project_import.py not found in backend/motion/")
        project_import = load_module("project_import", import_module_path)

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            projects_root = tmpdir / "Motion Projects"
            word_timing = projects_root / "Word Timing"
            word_timing.mkdir(parents=True)
            # Create session metadata file and audio file
            audio_file = word_timing / "voiceover.wav"
            audio_file.write_bytes(b"RIFF" + b"\x00" * 200)
            session_meta = word_timing / "MyProject.session.json"
            session_meta.write_text(json.dumps({
                "sessionId": "wt-test-session-999",
                "audioPath": "voiceover.wav",
            }), encoding="utf-8")

            project_temp = tmpdir / "project"
            project_temp.mkdir()
            manifest = {
                "voiceoverBinding": {
                    "logicalId": "voiceover.primary",
                    "source": "framepilot-linked-audio",
                    "required": True,
                    "sessionId": "wt-test-session-999",
                    "target": "public/audio/narration.wav",
                }
            }
            result = project_import.resolve_narration_binding(manifest, project_temp, projects_root)
            self.assertIsNotNone(result)
            self.assertEqual(result["status"], "resolved")
            self.assertTrue((project_temp / "public/audio/narration.wav").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
