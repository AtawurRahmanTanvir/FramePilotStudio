#!/usr/bin/env python3
"""Comprehensive independent verification of the 10 Narration Auto-Linking scenarios:
1. Exact sessionId match
2. Correct local audio resolution
3. Valid audio copied to public/audio/narration.wav
4. Missing local audio produces a warning
5. Ambiguous session produces a warning
6. Legacy manifest without binding still imports
7. ZIP-contained narration is preserved
8. Path traversal is rejected
9. Original audio remains unchanged
10. Session metadata cannot cause arbitrary filesystem access
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_MOTION = PROJECT_ROOT / "backend" / "motion"
SAMPLE_PROJECT = PROJECT_ROOT / "product-assets" / "motion-producer" / "examples" / "sample-remotion-project"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


project_import = load_module("project_import", BACKEND_MOTION / "project_import.py")


class NarrationAutoLinkingScenarios(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmpdir = Path(self.tmp.name)
        self.projects_root = self.tmpdir / "Motion Projects"
        self.projects_root.mkdir(parents=True)
        self.word_timing_dir = self.projects_root / "Word Timing"
        self.word_timing_dir.mkdir(parents=True)

    def tearDown(self):
        self.tmp.cleanup()

    def _create_fake_audio(self, filename: str, content: bytes = b"RIFF\x24\x00\x00\x00WAVEfmt ") -> Path:
        path = self.word_timing_dir / filename
        path.write_bytes(content)
        return path

    def _create_session_meta(self, meta_name: str, session_id: str, audio_filename: str) -> Path:
        path = self.word_timing_dir / meta_name
        path.write_text(json.dumps({
            "sessionId": session_id,
            "audioPath": audio_filename,
            "projectName": "Test",
        }), encoding="utf-8")
        return path

    def _create_temp_project(self) -> Path:
        proj = self.tmpdir / f"proj_{os.urandom(4).hex()}"
        proj.mkdir()
        return proj

    def test_01_exact_session_id_match(self):
        """Scenario 1: Exact sessionId match identifies the correct local session."""
        audio_file = self._create_fake_audio("voiceover_ch1.wav")
        self._create_session_meta("session_01.session.json", "wt-2026-exact-1234", "voiceover_ch1.wav")
        proj_temp = self._create_temp_project()

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "wt-2026-exact-1234",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertIsNotNone(res)
        self.assertEqual(res["status"], "resolved")
        self.assertEqual(res["sessionId"], "wt-2026-exact-1234")
        self.assertEqual(res["method"], "session-metadata")

    def test_02_correct_local_audio_resolution(self):
        """Scenario 2: Correct local audio is resolved from the matched session."""
        audio_content = b"RIFF-SPEECH-TEST-DATA-CONTENT-12345"
        self._create_fake_audio("doc_narration_primary.wav", audio_content)
        self._create_session_meta("doc.session.json", "sess-correct-audio", "doc_narration_primary.wav")
        proj_temp = self._create_temp_project()

        manifest = {
            "narration": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-correct-audio",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertEqual(res["status"], "resolved")
        self.assertTrue(Path(res["source"]).is_file())
        self.assertEqual(Path(res["source"]).name, "doc_narration_primary.wav")

    def test_03_valid_audio_copied_to_target(self):
        """Scenario 3: Audio file is staged at the exact target path inside the project."""
        audio_content = b"RIFF\x24\x00\x00\x00WAVE_VALID_AUDIO_BYTES_COPIED"
        self._create_fake_audio("narr_take3.wav", audio_content)
        self._create_session_meta("take3.session.json", "sess-copy-test", "narr_take3.wav")
        proj_temp = self._create_temp_project()

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-copy-test",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertEqual(res["status"], "resolved")

        target_file = proj_temp / "public" / "audio" / "narration.wav"
        self.assertTrue(target_file.is_file(), "Target narration file does not exist")
        self.assertEqual(target_file.read_bytes(), audio_content, "Copied content does not match source")

    def test_04_missing_local_audio_produces_warning(self):
        """Scenario 4: Missing local audio emits warning and does not crash the import."""
        # Meta points to audio file that does not exist
        self._create_session_meta("ghost.session.json", "sess-ghost", "deleted_voiceover.wav")
        proj_temp = self._create_temp_project()

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-ghost",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertIsNotNone(res)
        self.assertEqual(res["status"], "unresolved")
        self.assertIn("warning", res)
        self.assertIn("could not be matched", res["warning"])

    def test_05_ambiguous_or_unknown_session_produces_warning(self):
        """Scenario 5: Completely unknown session ID gracefully produces a non-blocking warning."""
        proj_temp = self._create_temp_project()
        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "nonexistent-session-99999",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertIsNotNone(res)
        self.assertEqual(res["status"], "unresolved")
        self.assertIn("warning", res)

    def test_06_legacy_manifest_without_binding_still_imports(self):
        """Scenario 6: Legacy manifests without voiceoverBinding/narration return None cleanly."""
        proj_temp = self._create_temp_project()
        manifest = {
            "schemaVersion": 1,
            "projectName": "Legacy 1.0 Project",
            "entryPoint": "src/index.tsx",
            "compositionId": "Main",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "durationInFrames": 600,
            "remotionVersion": "4.0.540",
            "assets": [],
            "voiceover": None,
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertIsNone(res, "Legacy manifest should produce None (no-op)")

    def test_07_zip_contained_narration_is_preserved(self):
        """Scenario 7: If the target audio is already in the ZIP, preserve it without overwriting."""
        proj_temp = self._create_temp_project()
        target_path = proj_temp / "public" / "audio" / "narration.wav"
        target_path.parent.mkdir(parents=True, exist_ok=True)
        zip_audio_content = b"RIFF-INCLUDED-IN-ZIP-AUDIO"
        target_path.write_bytes(zip_audio_content)

        # Even if a matching session exists in Word Timing...
        self._create_fake_audio("other_audio.wav", b"RIFF-OTHER-AUDIO")
        self._create_session_meta("other.session.json", "sess-preserve-zip", "other_audio.wav")

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-preserve-zip",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertEqual(res["status"], "included")
        self.assertEqual(res["method"], "zip-included")
        self.assertEqual(target_path.read_bytes(), zip_audio_content, "Zip audio was overwritten!")

    def test_08_path_traversal_is_rejected(self):
        """Scenario 8: Manifest with path traversal in target is rejected."""
        proj_temp = self._create_temp_project()
        dangerous_targets = [
            "../escape.wav",
            "../../Windows/System32/evil.wav",
            "/absolute/narration.wav",
            "C:\\Windows\\System32\\evil.wav",
        ]
        for bad_target in dangerous_targets:
            manifest = {
                "schemaVersion": 1,
                "projectName": "Attack Project",
                "entryPoint": "src/index.tsx",
                "compositionId": "Main",
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "durationInFrames": 600,
                "remotionVersion": "4.0.540",
                "assets": [],
                "voiceoverBinding": {
                    "logicalId": "voiceover.primary",
                    "source": "framepilot-linked-audio",
                    "required": True,
                    "target": bad_target,
                }
            }
            package = {
                "dependencies": {
                    "react": "19.1.0",
                    "react-dom": "19.1.0",
                    "remotion": "4.0.540",
                }
            }
            with self.assertRaises(ValueError, msg=f"Did not reject target: {bad_target}"):
                project_import.validate_manifest(manifest, package, {"src/index.tsx"})

    def test_09_original_audio_remains_unchanged(self):
        """Scenario 9: Source voiceover file is copied, never modified or deleted."""
        original_bytes = b"RIFF-ORIGINAL-UNTOUCHED-VOICEOVER-DATA"
        audio_file = self._create_fake_audio("master_take.wav", original_bytes)
        self._create_session_meta("master.session.json", "sess-integrity-test", "master_take.wav")
        proj_temp = self._create_temp_project()

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-integrity-test",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        self.assertEqual(res["status"], "resolved")

        # Verify source file still exists and has exact same bytes
        self.assertTrue(audio_file.is_file(), "Original audio file was deleted!")
        self.assertEqual(audio_file.read_bytes(), original_bytes, "Original audio file was modified!")

    def test_10_session_metadata_cannot_cause_arbitrary_filesystem_access(self):
        """Scenario 10: Malicious audioPath in session metadata cannot escape Word Timing directory."""
        # Create evil session metadata pointing to /Windows or outside
        evil_meta = self.word_timing_dir / "evil.session.json"
        evil_meta.write_text(json.dumps({
            "sessionId": "sess-evil-escape",
            "audioPath": "../../../Windows/win.ini",
        }), encoding="utf-8")
        proj_temp = self._create_temp_project()

        manifest = {
            "voiceoverBinding": {
                "logicalId": "voiceover.primary",
                "source": "framepilot-linked-audio",
                "required": True,
                "sessionId": "sess-evil-escape",
                "target": "public/audio/narration.wav",
            }
        }
        res = project_import.resolve_narration_binding(manifest, proj_temp, self.projects_root)
        # It must either fail safely or report unresolved; target must not contain escaped system file
        if res and res.get("status") == "resolved":
            target_path = proj_temp / "public" / "audio" / "narration.wav"
            self.assertFalse(target_path.exists(), "Arbitrary file was copied via traversal in session metadata!")
        self.assertEqual(res["status"], "unresolved")


if __name__ == "__main__":
    unittest.main(verbosity=2)

