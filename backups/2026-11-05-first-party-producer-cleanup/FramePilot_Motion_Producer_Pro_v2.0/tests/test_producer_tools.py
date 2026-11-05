from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "claude-skill" / "framepilot-motion-producer"
SCRIPTS = SKILL / "scripts"
SAMPLE_PROJECT = ROOT / "examples" / "sample-remotion-project"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


csv_validator = load_module("csv_validator", SCRIPTS / "validate_word_timing.py")
zip_validator = load_module("zip_validator", SCRIPTS / "validate_project_zip.py")


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


if __name__ == "__main__":
    unittest.main(verbosity=2)
