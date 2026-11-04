from __future__ import annotations

import importlib.util
import json
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


word_engine = load_module("motion_word_timing_engine", ROOT / "backend/motion/word_timing_engine.py")
project_import = load_module("motion_project_import", ROOT / "backend/motion/project_import.py")


class WordTimingTests(unittest.TestCase):
    def test_case_and_punctuation_normalization(self):
        script = ["Hello,", "WORLD!"]
        audio = [
            {"word": "hello", "start": 0.1, "end": 0.42, "score": 0.98},
            {"word": "world", "start": 0.5, "end": 0.91, "score": 0.97},
        ]
        rows, report = word_engine.align_script_to_recognition(script, audio)
        self.assertEqual([row["_status"] for row in rows], ["MATCH", "MATCH"])
        self.assertEqual(rows[0]["Start_ms"], "100")
        self.assertEqual(rows[1]["End_ms"], "910")
        self.assertFalse(report["alignment_review_required"])

    def test_repeated_words_keep_separate_ordered_intervals(self):
        script = ["go", "go", "go"]
        audio = [
            {"word": "go", "start": 0.1, "end": 0.2, "score": 0.9},
            {"word": "go", "start": 0.5, "end": 0.6, "score": 0.9},
            {"word": "go", "start": 0.9, "end": 1.0, "score": 0.9},
        ]
        rows, report = word_engine.align_script_to_recognition(script, audio)
        self.assertEqual([row["Start_ms"] for row in rows], ["100", "500", "900"])
        self.assertEqual(report["matched_words"], 3)

    def test_missing_and_extra_words_are_flagged_without_fake_times(self):
        script = ["alpha", "beta", "gamma"]
        audio = [
            {"word": "alpha", "start": 0.0, "end": 0.2, "score": 0.99},
            {"word": "gamma", "start": 0.5, "end": 0.8, "score": 0.95},
            {"word": "extra", "start": 1.0, "end": 1.2, "score": 0.9},
        ]
        rows, report = word_engine.align_script_to_recognition(script, audio)
        self.assertTrue(report["alignment_review_required"])
        self.assertTrue(any(row["_status"] == "MISSING_IN_AUDIO" and row["Start_ms"] == "" for row in rows))
        self.assertTrue(any(row["_status"] == "EXTRA_IN_AUDIO" and row["Script_Word"] == "" for row in rows))

    def test_csv_uses_exact_five_column_contract(self):
        rows, report = word_engine.align_script_to_recognition(
            ["FramePilot"], [{"word": "FramePilot", "start": 0.15, "end": 0.8, "score": 0.99}]
        )
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "timing.csv"
            csv_path, qa_path = word_engine.write_outputs(rows, output, report)
            import csv
            with csv_path.open(encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                self.assertEqual(reader.fieldnames, ["Word_Index", "Script_Word", "Recognized_Word", "Start_ms", "End_ms"])
                data = list(reader)
            self.assertEqual(len(data), 1)
            self.assertTrue(qa_path.is_file())
            self.assertEqual(json.loads(qa_path.read_text(encoding="utf-8"))["matched_words"], 1)


class ProjectImportTests(unittest.TestCase):
    def make_zip(self, path: Path, extra: list[tuple[str, bytes, int]] | None = None, entry_source: bytes = b"export {};\n"):
        manifest = {
            "schemaVersion": 1,
            "projectName": "Test Motion Project",
            "entryPoint": "src/index.ts",
            "compositionId": "Main",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "durationInFrames": 300,
            "remotionVersion": "4.0.540",
            "voiceover": None,
            "wordTiming": None,
            "inputProps": {},
            "assets": [],
        }
        package = {
            "name": "test-motion-project",
            "private": True,
            "dependencies": {"react": "19.1.0", "react-dom": "19.1.0", "remotion": "4.0.540"},
        }
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("motion-project.json", json.dumps(manifest))
            archive.writestr("package.json", json.dumps(package))
            archive.writestr("src/index.ts", entry_source)
            for name, data, mode in extra or []:
                info = zipfile.ZipInfo(name)
                info.external_attr = mode << 16
                archive.writestr(info, data)

    def test_valid_project_passes_static_inspection_and_import(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / "valid.zip"
            self.make_zip(archive)
            result = project_import.inspect_archive(archive)
            self.assertEqual(result["compositionId"], "Main")
            imported = project_import.import_archive(archive, root / "projects")
            self.assertEqual(imported["status"], "IMPORTED")
            self.assertTrue((Path(imported["projectPath"]) / "src/index.ts").is_file())

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "traversal.zip"
            self.make_zip(archive, [("../outside.txt", b"bad", 0o100644)])
            with self.assertRaises(ValueError):
                project_import.inspect_archive(archive)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "symlink.zip"
            self.make_zip(archive, [("src/link", b"target", stat.S_IFLNK | 0o777)])
            with self.assertRaises(ValueError):
                project_import.inspect_archive(archive)

    def test_node_modules_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "modules.zip"
            self.make_zip(archive, [("node_modules/evil/index.js", b"bad", 0o100644)])
            with self.assertRaises(ValueError):
                project_import.inspect_archive(archive)


    def test_drive_qualified_path_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "drive-path.zip"
            self.make_zip(archive, [("C:/outside.txt", b"bad", 0o100644)])
            with self.assertRaises(ValueError):
                project_import.inspect_archive(archive)

    def test_case_colliding_duplicate_path_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "duplicate.zip"
            self.make_zip(archive, [("src/INDEX.ts", b"duplicate", 0o100644)])
            with self.assertRaises(ValueError):
                project_import.inspect_archive(archive)

    def test_unapproved_dev_dependency_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "dev-dependency.zip"
            self.make_zip(archive)
            with zipfile.ZipFile(archive, "r") as source:
                entries = {item.filename: source.read(item.filename) for item in source.infolist()}
            package = json.loads(entries["package.json"])
            package["devDependencies"] = {"unreviewed-loader": "1.0.0"}
            entries["package.json"] = json.dumps(package).encode()
            revised = Path(temp) / "dev-dependency-revised.zip"
            with zipfile.ZipFile(revised, "w", compression=zipfile.ZIP_DEFLATED) as target:
                for name, data in entries.items():
                    target.writestr(name, data)
            with self.assertRaises(ValueError):
                project_import.inspect_archive(revised)

    def test_non_integer_composition_dimensions_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "fractional-dimensions.zip"
            self.make_zip(archive)
            with zipfile.ZipFile(archive, "r") as source:
                entries = {item.filename: source.read(item.filename) for item in source.infolist()}
            manifest = json.loads(entries["motion-project.json"])
            manifest["width"] = 1920.5
            entries["motion-project.json"] = json.dumps(manifest).encode()
            revised = Path(temp) / "fractional-dimensions-revised.zip"
            with zipfile.ZipFile(revised, "w", compression=zipfile.ZIP_DEFLATED) as target:
                for name, data in entries.items():
                    target.writestr(name, data)
            with self.assertRaises(ValueError):
                project_import.inspect_archive(revised)

    def test_unapproved_dependency_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "dependency.zip"
            self.make_zip(archive)
            with zipfile.ZipFile(archive, "r") as source:
                entries = {item.filename: source.read(item.filename) for item in source.infolist()}
            package = json.loads(entries["package.json"])
            package["dependencies"]["left-pad"] = "1.3.0"
            entries["package.json"] = json.dumps(package).encode()
            revised = Path(temp) / "dependency-revised.zip"
            with zipfile.ZipFile(revised, "w", compression=zipfile.ZIP_DEFLATED) as target:
                for name, data in entries.items():
                    target.writestr(name, data)
            with self.assertRaises(ValueError):
                project_import.inspect_archive(revised)

    def test_missing_relative_source_import_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "missing-import.zip"
            self.make_zip(archive, entry_source=b'import { Root } from "./Root";\n')
            with self.assertRaisesRegex(ValueError, "Relative source import is missing"):
                project_import.inspect_archive(archive)

    def test_absolute_source_import_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / "absolute-import.zip"
            self.make_zip(archive, entry_source=b'import "C:/outside.js";\n')
            with self.assertRaisesRegex(ValueError, "Absolute source import is not allowed"):
                project_import.inspect_archive(archive)


if __name__ == "__main__":
    unittest.main()
