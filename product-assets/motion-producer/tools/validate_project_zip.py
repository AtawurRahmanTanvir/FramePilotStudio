#!/usr/bin/env python3
"""Static, non-executing validation for a FramePilot Remotion project ZIP.

This is a package hygiene validator, NOT a security sandbox and NOT a guarantee
that project source is safe to execute. FramePilot's Windows isolation gate is
still the authority for executing imported project code.
"""
from __future__ import annotations

import argparse
import json
import re
import stat
import sys
import zipfile
from pathlib import PurePosixPath
from typing import Any

EXPECTED = {"remotion": "4.0.540", "react": "19.1.0", "react-dom": "19.1.0"}
FORBIDDEN_PARTS = {"node_modules", ".git", "__pycache__", ".cache", "dist", "build", "coverage", "__MACOSX"}
FORBIDDEN_NAMES = {".env", ".env.local", ".npmrc", "id_rsa", "id_ed25519"}
SOURCE_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}


def safe_member_name(name: str) -> tuple[bool, str]:
    if "\\" in name or name.startswith("/"):
        return False, "absolute_or_windows_style_path"
    path = PurePosixPath(name)
    if any(part in {"..", ""} for part in path.parts):
        return False, "path_traversal_or_empty_segment"
    if path.parts and re.match(r"^[A-Za-z]:", path.parts[0]):
        return False, "drive_qualified_path"
    return True, ""


def validate_zip(path: str, max_uncompressed_bytes: int = 10 * 1024**3) -> dict[str, Any]:
    report: dict[str, Any] = {
        "status": "PASS", "archive": path, "files": 0,
        "uncompressedBytes": 0, "errors": [], "warnings": [],
        "checks": {"sourceExecuted": False, "archiveExtracted": False},
    }
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            names: set[str] = set()
            for info in infos:
                name = info.filename.rstrip("/")
                if not name:
                    continue
                report["files"] += 1
                report["uncompressedBytes"] += info.file_size
                ok, reason = safe_member_name(name)
                if not ok:
                    report["errors"].append({"type": reason, "name": info.filename})
                if name in names:
                    report["errors"].append({"type": "duplicate_archive_path", "name": name})
                names.add(name)
                parts = PurePosixPath(name).parts
                if any(part in FORBIDDEN_PARTS for part in parts):
                    report["errors"].append({"type": "forbidden_directory", "name": name})
                base_name = PurePosixPath(name).name
                if base_name in FORBIDDEN_NAMES or base_name.startswith(".env."):
                    report["errors"].append({"type": "forbidden_secret_or_config", "name": name})
                mode = (info.external_attr >> 16) & 0xFFFF
                if stat.S_ISLNK(mode):
                    report["errors"].append({"type": "symlink_entry", "name": name})
                if info.file_size > 0 and info.compress_size == 0:
                    report["errors"].append({"type": "invalid_compressed_size", "name": name})

            if report["files"] > 50000:
                report["errors"].append({"type": "too_many_archive_entries", "count": report["files"]})
            if report["uncompressedBytes"] > max_uncompressed_bytes:
                report["errors"].append({"type": "archive_too_large", "bytes": report["uncompressedBytes"]})

            if "motion-project.json" not in names:
                report["errors"].append({"type": "manifest_not_at_zip_root"})
            if any(name.count("/") and name.split("/", 1)[0] == "motion-project.json" for name in names):
                report["errors"].append({"type": "nested_manifest_detected"})

            if "motion-project.json" in names:
                manifest = json.loads(archive.read("motion-project.json").decode("utf-8-sig"))
                required = ["projectName", "entryPoint", "compositionId", "width", "height", "fps", "durationInFrames", "remotionVersion", "inputProps"]
                missing = [key for key in required if key not in manifest]
                if missing:
                    report["errors"].append({"type": "manifest_missing_fields", "fields": missing})
                for field in ("width", "height", "fps", "durationInFrames"):
                    value = manifest.get(field)
                    if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
                        report["errors"].append({"type": "invalid_manifest_value", "field": field, "value": value})
                if manifest.get("remotionVersion") != EXPECTED["remotion"]:
                    report["errors"].append({"type": "remotion_version_mismatch", "expected": EXPECTED["remotion"], "actual": manifest.get("remotionVersion")})
                entry = manifest.get("entryPoint", "")
                entry_ok, entry_reason = safe_member_name(entry) if isinstance(entry, str) else (False, "entry_point_not_string")
                if not entry_ok:
                    report["errors"].append({"type": "unsafe_entry_point", "entryPoint": entry, "reason": entry_reason})
                if entry not in names:
                    report["errors"].append({"type": "entry_point_missing", "entryPoint": entry})
                for optional_path_key in ("voiceover", "wordTiming"):
                    optional_path = manifest.get(optional_path_key)
                    if optional_path is not None:
                        path_ok, path_reason = safe_member_name(optional_path) if isinstance(optional_path, str) else (False, "asset_path_not_string")
                        if not path_ok:
                            report["errors"].append({"type": "unsafe_manifest_asset_path", "field": optional_path_key, "path": optional_path, "reason": path_reason})
                        elif optional_path not in names:
                            report["errors"].append({"type": "manifest_asset_missing", "field": optional_path_key, "path": optional_path})
                binding = manifest.get("voiceoverBinding") or manifest.get("narration")
                if binding is not None:
                    if not isinstance(binding, dict):
                        report["errors"].append({"type": "invalid_voiceover_binding_type"})
                    else:
                        target = binding.get("target")
                        target_ok, target_reason = safe_member_name(target) if isinstance(target, str) else (False, "target_not_string")
                        if not target_ok:
                            report["errors"].append({"type": "unsafe_voiceover_binding_target", "target": target, "reason": target_reason})
                        if binding.get("source") != "framepilot-linked-audio":
                            report["errors"].append({"type": "invalid_voiceover_binding_source", "source": binding.get("source")})
                manifest_assets = manifest.get("assets", [])
                if not isinstance(manifest_assets, list):
                    report["errors"].append({"type": "manifest_assets_must_be_array"})
                else:
                    for asset_path in manifest_assets:
                        path_ok, path_reason = safe_member_name(asset_path) if isinstance(asset_path, str) else (False, "asset_path_not_string")
                        if not path_ok:
                            report["errors"].append({"type": "unsafe_manifest_asset_path", "path": asset_path, "reason": path_reason})
                        elif asset_path not in names:
                            report["errors"].append({"type": "manifest_asset_missing", "path": asset_path})
                if "src/Root.tsx" not in names:
                    report["warnings"].append({"type": "root_component_not_at_standard_path"})
                root_text = archive.read("src/Root.tsx").decode("utf-8", errors="replace") if "src/Root.tsx" in names else ""
                if manifest.get("compositionId") and f'id="{manifest["compositionId"]}"' not in root_text and f"id='{manifest['compositionId']}'" not in root_text:
                    report["warnings"].append({"type": "composition_id_not_found_by_static_scan", "compositionId": manifest.get("compositionId")})

            if "package.json" not in names:
                report["errors"].append({"type": "package_json_missing"})
            else:
                package = json.loads(archive.read("package.json").decode("utf-8-sig"))
                deps = package.get("dependencies", {})
                for key, expected in EXPECTED.items():
                    actual = deps.get(key)
                    if actual != expected:
                        report["errors"].append({"type": "dependency_version_mismatch", "package": key, "expected": expected, "actual": actual})
                scripts = package.get("scripts", {})
                lifecycle = [name for name in scripts if name.lower() in {"preinstall", "install", "postinstall", "prepare"}]
                if lifecycle:
                    report["errors"].append({"type": "package_lifecycle_scripts_present", "scripts": lifecycle})

            if "src/index.tsx" not in names:
                report["errors"].append({"type": "entry_registration_file_missing", "expected": "src/index.tsx"})
            elif "src/index.tsx" in names:
                entry_source = archive.read("src/index.tsx").decode("utf-8", errors="replace")
                if "registerRoot" not in entry_source:
                    report["errors"].append({"type": "register_root_not_found"})

            for name in names:
                if PurePosixPath(name).suffix.lower() not in SOURCE_EXTENSIONS:
                    continue
                source = archive.read(name).decode("utf-8", errors="replace")
                if re.search(r"\b(renderMedia|renderStill)\s*\(", source):
                    report["errors"].append({"type": "render_api_call_in_project_source", "file": name})
                if re.search(r"npx\s+remotion\s+render|powershell(?:\.exe)?\s+-|cmd(?:\.exe)?\s+/c", source, re.I):
                    report["errors"].append({"type": "external_render_command_in_source", "file": name})
                if re.search(r"\b(child_process|execSync|spawnSync)\b", source):
                    report["warnings"].append({"type": "process_api_reference_requires_manual_review", "file": name})
                if re.search(r"https?://", source):
                    report["warnings"].append({"type": "remote_url_in_source_requires_manual_review", "file": name})

            report["manifest"] = manifest if "motion-project.json" in names else None
    except (OSError, zipfile.BadZipFile, UnicodeError, json.JSONDecodeError, KeyError) as exc:
        report["errors"].append({"type": "archive_read_error", "message": str(exc)})

    if report["errors"]:
        report["status"] = "FAIL"
    elif report["warnings"]:
        report["status"] = "PASS_WITH_WARNINGS"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip_path")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--json-output")
    parser.add_argument("--max-gb", type=float, default=10.0)
    args = parser.parse_args()
    report = validate_zip(args.zip_path, int(args.max_gb * 1024**3))
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if args.json_output:
        with open(args.json_output, "w", encoding="utf-8") as stream:
            stream.write(payload)
    if args.json:
        print(payload)
    else:
        print(f"Status: {report['status']} | Files: {report['files']} | Uncompressed: {report['uncompressedBytes']} bytes")
        for item in report["errors"]:
            print("ERROR:", item)
        for item in report["warnings"]:
            print("WARNING:", item)
        print("NOTE: static validation is not a Windows security sandbox.")
    return 2 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
