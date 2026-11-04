from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import stat
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

MAX_ENTRIES = 12000
MAX_TOTAL_UNCOMPRESSED = 3 * 1024 * 1024 * 1024
MAX_SINGLE_FILE = 1024 * 1024 * 1024
MAX_SOURCE_FILE = 16 * 1024 * 1024
MAX_COMPRESSION_RATIO = 1200
SUPPORTED_REMOTION = {"4.0.540"}
SUPPORTED_DEPENDENCIES = {
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "remotion": "4.0.540",
    "@remotion/player": "4.0.540",
    "@remotion/transitions": "4.0.540",
    "@remotion/motion-blur": "4.0.540",
    "@remotion/captions": "4.0.540",
    "@remotion/compositor-win32-x64-msvc": "4.0.540",
}
BLOCKED_SUFFIXES = {".exe", ".dll", ".com", ".bat", ".cmd", ".ps1", ".sh", ".msi", ".scr"}
SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs"}
SOURCE_IMPORT_RE = re.compile(
    r"""(?:(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?|import\s*\(|require\s*\()\s*["']([^"']+)["']""",
    re.MULTILINE,
)
SOURCE_RESOLUTION_SUFFIXES = ("", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json")


def emit(event: str, **payload: Any) -> None:
    print(json.dumps({"event": event, **payload}, ensure_ascii=False), flush=True)


def safe_member_name(name: str) -> str:
    if not name or "\\" in name or "\x00" in name:
        raise ValueError(f"Unsafe ZIP member name: {name!r}")
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in {"..", "."} for part in path.parts):
        raise ValueError(f"ZIP path traversal is not allowed: {name}")
    if path.parts and re.match(r"^[A-Za-z]:", path.parts[0]):
        raise ValueError(f"Drive-qualified ZIP path is not allowed: {name}")
    if any(":" in part for part in path.parts):
        raise ValueError(f"Alternate data stream path is not allowed: {name}")
    return path.as_posix().rstrip("/")


def inspect_archive(zip_path: Path) -> dict:
    if not zip_path.is_file() or zip_path.suffix.casefold() != ".zip":
        raise ValueError("Choose a valid Remotion project ZIP file.")
    with zipfile.ZipFile(zip_path) as archive:
        infos = archive.infolist()
        if not infos or len(infos) > MAX_ENTRIES:
            raise ValueError(f"ZIP entry count must be between 1 and {MAX_ENTRIES:,}.")
        seen = set()
        total = 0
        manifest_data = None
        package_data = None
        files = set()
        source_data: dict[str, str] = {}
        for info in infos:
            normalized = safe_member_name(info.filename)
            if not normalized:
                continue
            case_key = normalized.casefold()
            parts_lower = [part.casefold() for part in PurePosixPath(normalized).parts]
            if "node_modules" in parts_lower or ".git" in parts_lower or ".venv" in parts_lower:
                raise ValueError(f"Project ZIP must not include node_modules, .git or virtual environments: {normalized}")
            if Path(normalized).suffix.casefold() in BLOCKED_SUFFIXES:
                raise ValueError(f"Executable or installer files are not allowed in a Motion project ZIP: {normalized}")
            if case_key in seen:
                raise ValueError(f"Duplicate ZIP path after normalization: {normalized}")
            seen.add(case_key)
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise ValueError(f"Symbolic links are not allowed in project ZIPs: {normalized}")
            if info.file_size > MAX_SINGLE_FILE:
                raise ValueError(f"Project contains an oversized file: {normalized}")
            if PurePosixPath(normalized).suffix.casefold() in SOURCE_SUFFIXES and info.file_size > MAX_SOURCE_FILE:
                raise ValueError(f"Source file is too large to inspect safely: {normalized}")
            total += info.file_size
            if total > MAX_TOTAL_UNCOMPRESSED:
                raise ValueError("Project ZIP exceeds the 3 GB expanded-size safety limit.")
            if info.file_size > 1024 * 1024 and info.compress_size > 0:
                ratio = info.file_size / info.compress_size
                if ratio > MAX_COMPRESSION_RATIO:
                    raise ValueError(f"Suspicious compression ratio in {normalized}.")
            if not info.is_dir():
                files.add(normalized)
                if normalized == "motion-project.json":
                    manifest_data = archive.read(info)
                if normalized == "package.json":
                    package_data = archive.read(info)
                if PurePosixPath(normalized).suffix.casefold() in SOURCE_SUFFIXES:
                    try:
                        source_data[normalized] = archive.read(info).decode("utf-8-sig")
                    except UnicodeDecodeError as exc:
                        raise ValueError(f"Source file is not valid UTF-8: {normalized}") from exc
        if manifest_data is None:
            raise ValueError("motion-project.json must be at the ZIP root. See the Claude Project Instructions.")
        if package_data is None:
            raise ValueError("package.json must be present at the ZIP root.")
        try:
            manifest = json.loads(manifest_data.decode("utf-8-sig"))
            package = json.loads(package_data.decode("utf-8-sig"))
        except Exception as exc:
            raise ValueError(f"Project manifest or package.json is invalid JSON: {exc}") from exc
        validate_manifest(manifest, package, files)
        validate_source_imports(source_data, files)
        return {
            "projectName": str(manifest["projectName"]),
            "compositionId": str(manifest["compositionId"]),
            "entryPoint": str(manifest["entryPoint"]),
            "width": int(manifest["width"]),
            "height": int(manifest["height"]),
            "fps": float(manifest["fps"]),
            "durationInFrames": int(manifest["durationInFrames"]),
            "remotionVersion": str(manifest["remotionVersion"]),
            "fileCount": len(files),
            "uncompressedBytes": total,
            "assets": list(manifest.get("assets") or []),
            "warnings": [],
        }


def validate_manifest(manifest: dict, package: dict, files: set[str]) -> None:
    required = ["schemaVersion", "projectName", "entryPoint", "compositionId", "width", "height", "fps", "durationInFrames", "remotionVersion", "assets"]
    missing = [key for key in required if key not in manifest]
    if missing:
        raise ValueError("motion-project.json is missing required fields: " + ", ".join(missing))
    if manifest["schemaVersion"] != 1:
        raise ValueError(f"Unsupported Motion Project schema version: {manifest['schemaVersion']}")
    if not isinstance(manifest["projectName"], str) or not manifest["projectName"].strip():
        raise ValueError("projectName must be a non-empty string.")
    for field in ("entryPoint", "compositionId"):
        if not isinstance(manifest[field], str) or not manifest[field].strip():
            raise ValueError(f"{field} must be a non-empty string.")
    entry = safe_member_name(manifest["entryPoint"])
    if entry not in files:
        raise ValueError(f"Manifest entry point is missing: {entry}")
    if Path(entry).suffix.casefold() not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        raise ValueError("entryPoint must be a TypeScript or JavaScript Remotion entry file.")
    if not isinstance(manifest["assets"], list) or len(manifest["assets"]) > 10000:
        raise ValueError("assets must be an array with at most 10,000 entries.")
    for asset in manifest["assets"]:
        path = safe_member_name(str(asset))
        if path not in files:
            raise ValueError(f"Declared project asset is missing: {path}")
    for field, lower, upper in (("width", 16, 7680), ("height", 16, 7680), ("fps", 1, 120), ("durationInFrames", 1, 2_000_000)):
        try:
            value = float(manifest[field])
        except (TypeError, ValueError):
            raise ValueError(f"Manifest field {field} must be numeric.")
        if not math.isfinite(value) or not lower <= value <= upper:
            raise ValueError(f"Manifest field {field} is outside supported bounds.")
        if field in {"width", "height", "durationInFrames"} and not value.is_integer():
            raise ValueError(f"Manifest field {field} must be an integer.")
    version = str(manifest["remotionVersion"])
    if version not in SUPPORTED_REMOTION:
        raise ValueError(f"This Motion runtime supports Remotion {', '.join(sorted(SUPPORTED_REMOTION))}; project requests {version}.")
    dependencies = package.get("dependencies") or {}
    if not isinstance(dependencies, dict):
        raise ValueError("package.json dependencies must be a JSON object.")
    # No project-level package installation occurs. Still validate every declared
    # dependency section so hidden dev/optional dependencies cannot bypass review.
    declared_dependencies: dict[str, Any] = {}
    for section in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
        section_value = package.get(section) or {}
        if not isinstance(section_value, dict):
            raise ValueError(f"package.json {section} must be a JSON object.")
        for name, declared_version in section_value.items():
            if name in declared_dependencies and str(declared_dependencies[name]) != str(declared_version):
                raise ValueError(f"Conflicting package versions declared for '{name}'.")
            declared_dependencies[name] = declared_version
    for name, declared_version in declared_dependencies.items():
        expected = SUPPORTED_DEPENDENCIES.get(name)
        if expected is None:
            raise ValueError(f"Dependency '{name}' is not part of the approved offline Motion runtime. Ask Copilot to review and add it to the pinned runtime first.")
        if str(declared_version) != expected:
            raise ValueError(f"Dependency '{name}' must be pinned exactly to {expected}; found {declared_version!r}.")
    for required_package in ("react", "react-dom", "remotion"):
        if str(declared_dependencies.get(required_package, "")) != SUPPORTED_DEPENDENCIES[required_package]:
            raise ValueError(f"package.json must declare {required_package}@{SUPPORTED_DEPENDENCIES[required_package]} exactly.")
    declared = declared_dependencies.get("remotion")
    if str(declared) != version:
        raise ValueError("package.json Remotion dependency does not match motion-project.json remotionVersion.")
    if (manifest.get("voiceover") is not None):
        audio = safe_member_name(str(manifest["voiceover"]))
        if audio not in files:
            raise ValueError(f"Manifest voiceover is missing: {audio}")
    if (manifest.get("wordTiming") is not None):
        timing = safe_member_name(str(manifest["wordTiming"]))
        if timing not in files:
            raise ValueError(f"Manifest word timing CSV is missing: {timing}")


def validate_source_imports(source_data: dict[str, str], files: set[str]) -> None:
    """Ensure every relative source import points at an archived local file.

    Package imports are resolved by the pinned worker runtime and are checked
    separately through package.json. Relative imports must be present in the
    ZIP so bundling cannot fail later or be tempted to resolve outside the
    imported project.
    """
    file_set = set(files)

    def resolve_local_import(source_name: str, specifier: str) -> str | None:
        if not specifier.startswith("."):
            if specifier.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", specifier):
                raise ValueError(f"Absolute source import is not allowed: {source_name} -> {specifier}")
            return None
        base = PurePosixPath(source_name).parent / specifier.replace("\\", "/")
        normalized = safe_member_name(base.as_posix())
        candidates = [normalized] + [normalized + suffix for suffix in SOURCE_RESOLUTION_SUFFIXES[1:]]
        candidates.extend(f"{normalized}/index{suffix}" for suffix in SOURCE_RESOLUTION_SUFFIXES[1:])
        if not any(candidate in file_set for candidate in candidates):
            raise ValueError(f"Relative source import is missing from the project ZIP: {source_name} -> {specifier}")
        return normalized

    for source_name, source in sorted(source_data.items()):
        for match in SOURCE_IMPORT_RE.finditer(source):
            resolve_local_import(source_name, match.group(1))


def safe_project_slug(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip(".-_")
    return (slug or "Motion-Project")[:80]


def import_archive(zip_path: Path, projects_root: Path) -> dict:
    info = inspect_archive(zip_path)
    projects_root.mkdir(parents=True, exist_ok=True)
    base = safe_project_slug(info["projectName"])
    destination = projects_root / base
    counter = 2
    while destination.exists():
        destination = projects_root / f"{base}-{counter}"
        counter += 1
    temp_root = Path(tempfile.mkdtemp(prefix=".motion-import-", dir=str(projects_root)))
    try:
        root_resolved = temp_root.resolve()
        with zipfile.ZipFile(zip_path) as archive:
            infos = archive.infolist()
            for index, member in enumerate(infos, start=1):
                normalized = safe_member_name(member.filename)
                if not normalized:
                    continue
                mode = (member.external_attr >> 16) & 0xFFFF
                if stat.S_ISLNK(mode):
                    raise ValueError(f"Symbolic links are not allowed: {normalized}")
                target = (temp_root / Path(*PurePosixPath(normalized).parts)).resolve()
                if os.path.commonpath([str(root_resolved), str(target)]) != str(root_resolved):
                    raise ValueError(f"ZIP extraction attempted to leave the project folder: {normalized}")
                if member.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member) as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
                emit("progress", percent=round(index * 100 / max(1, len(infos))), message=f"Extracting validated project files ({index}/{len(infos)})")
        # Re-validate the extracted layout, without executing any project code.
        manifest = json.loads((temp_root / "motion-project.json").read_text(encoding="utf-8-sig"))
        package = json.loads((temp_root / "package.json").read_text(encoding="utf-8-sig"))
        extracted_files = {p.relative_to(temp_root).as_posix() for p in temp_root.rglob("*") if p.is_file()}
        validate_manifest(manifest, package, extracted_files)
        extracted_source_data = {
            name: (temp_root / Path(*PurePosixPath(name).parts)).read_text(encoding="utf-8-sig")
            for name in extracted_files
            if PurePosixPath(name).suffix.casefold() in SOURCE_SUFFIXES
        }
        validate_source_imports(extracted_source_data, extracted_files)
        temp_root.rename(destination)
        return {**info, "projectPath": str(destination), "status": "IMPORTED"}
    except Exception:
        shutil.rmtree(temp_root, ignore_errors=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inspect", "import"])
    parser.add_argument("zip", help="Motion Project ZIP path")
    parser.add_argument("--projects-root", default="")
    args = parser.parse_args()
    try:
        archive = Path(args.zip).expanduser().resolve()
        if args.mode == "inspect":
            result = inspect_archive(archive)
        else:
            if not args.projects_root:
                raise ValueError("--projects-root is required for import.")
            result = import_archive(archive, Path(args.projects_root).expanduser().resolve())
        emit("result", project=result)
        return 0
    except Exception as exc:
        emit("error", message=str(exc), detail=type(exc).__name__)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
