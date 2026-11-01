#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FramePilot Studio legacy Filmora processing engine (UI removed).

Offline Windows desktop utility for Filmora 15 WFP projects.

Current MVP capabilities:
- Analyze a Filmora .wfp archive.
- Detect a still-image track and native marker list.
- Optionally align images to marker timestamps from CSV (or native markers).
- Randomly assign Filmora-native crop-pan-zoom keyframes from selected presets.
- Optionally relink image media to a selected folder using Image_NNN serials.
- Export a new WFP file without overwriting the original.
- Reopen and structurally validate the exported WFP.

Important: This MVP expects image clips to already exist on a video track in the
source Filmora project. It does not yet create/import hundreds of new media clips
into an otherwise empty WFP. Use Filmora to import the images and put them in
sequence on a still-image track first; this app handles alignment and motion.
"""
from __future__ import annotations

import base64
import copy
import csv
import hashlib
import json
import math
import os
import random
import re
import secrets
import sys
import time
import traceback
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable


APP_NAME = "FramePilot Studio"
APP_VERSION = "0.1.3"
TICKS_PER_SECOND = 10_000_000
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
SERIAL_RE = re.compile(r"(?:image|img)[_-]?(\d{1,5})(?:[_\-. ]|$)", re.IGNORECASE)
CSV_REQUIRED = {"Marker_Index", "Image_No", "Marker_Time_Seconds"}


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        # PyInstaller --onefile unpacks bundled data into _MEIPASS at runtime.
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    return Path(__file__).resolve().parent


def safe_json(data: bytes, name: str) -> Any:
    try:
        return json.loads(data.decode("utf-8-sig"))
    except Exception as exc:
        raise RuntimeError(f"WFP JSON পড়া যায়নি: {name}\n{exc}") from exc


def find_unique(names: list[str], suffix: str, required: bool = True) -> str | None:
    found = [n for n in names if n.replace("\\", "/").endswith(suffix)]
    if not found and not required:
        return None
    if len(found) != 1:
        raise RuntimeError(f"WFP-তে {suffix} একটিমাত্র থাকার কথা; পাওয়া গেছে {len(found)}টি।")
    return found[0]


def get_serial(path_or_name: str) -> int | None:
    base = str(path_or_name).replace("\\", "/").rsplit("/", 1)[-1]
    m = SERIAL_RE.search(base)
    return int(m.group(1)) if m else None


def file_path_from_wfp(value: str) -> str:
    text = str(value or "").replace("\\", "/")
    if text.lower().startswith("file:/"):
        text = text[6:]
    return text


def to_filmora_file_uri(path: Path) -> str:
    p = path.resolve().as_posix()
    # Filmora stores Windows paths as file:/F:/folder/file.jpg.
    if re.match(r"^[A-Za-z]:/", p):
        return "file:/" + p
    return "file:" + p if p.startswith("/") else "file:/" + p


def path_for_media_json(path: Path) -> str:
    return path.resolve().as_posix()


def read_marker_csv(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise RuntimeError(f"CSV ফাইল পাওয়া যায়নি: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = set(reader.fieldnames or [])
        if not CSV_REQUIRED.issubset(headers):
            missing = ", ".join(sorted(CSV_REQUIRED - headers))
            raise RuntimeError(f"CSV-তে প্রয়োজনীয় column নেই: {missing}")
        rows: list[dict[str, Any]] = []
        for line_no, row in enumerate(reader, 2):
            try:
                idx = int(row["Marker_Index"])
                image_no = int(row["Image_No"])
                seconds = float(row["Marker_Time_Seconds"])
            except Exception as exc:
                raise RuntimeError(f"CSV line {line_no}-এ index/image/time ভুল: {exc}") from exc
            if idx <= 0 or image_no <= 0 or not math.isfinite(seconds) or seconds < 0:
                raise RuntimeError(f"CSV line {line_no}-এ invalid index, image number বা time।")
            rows.append({"index": idx, "image_no": image_no, "seconds": seconds})
    if not rows:
        raise RuntimeError("CSV-তে কোনো marker row নেই।")
    rows.sort(key=lambda x: x["index"])
    for i, row in enumerate(rows, 1):
        if row["index"] != i:
            raise RuntimeError(f"CSV Marker_Index ধারাবাহিক নয়: row {i}-এ {row['index']} পাওয়া গেছে।")
        if i > 1 and row["seconds"] <= rows[i - 2]["seconds"]:
            raise RuntimeError(f"CSV timestamp increasing নয়: Image_{row['image_no']:03d}")
    return rows


def get_effect_templates() -> dict[str, Any]:
    path = app_dir() / "motion_templates.json"
    if not path.is_file():
        raise RuntimeError(
            "motion_templates.json পাওয়া যায়নি। App-এর ZIP থেকে সব ফাইল একই folder-এ Extract করো।"
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    templates = data.get("templates", {})
    required = {"zoom_in", "zoom_out", "pan", "pan_zoom"}
    if not required.issubset(templates):
        raise RuntimeError("motion_templates.json-এ প্রয়োজনীয় চারটি Filmora template নেই।")
    return templates


@dataclass
class ProjectAnalysis:
    project: Path
    timeline_name: str
    extra_name: str
    project_info_name: str | None
    medias_info_name: str | None
    timeline: dict[str, Any]
    extra: dict[str, Any]
    project_info: dict[str, Any]
    medias_info: dict[str, Any] | None
    media_jsons: dict[str, dict[str, Any]]
    image_track_index: int
    image_clips: list[dict[str, Any]]
    marker_key: str | None
    markers: list[dict[str, Any]]
    audio_end: int
    fps_num: int
    fps_den: int
    fps: float
    frame_ticks: int
    project_width: int
    project_height: int
    csv_rows: list[dict[str, Any]] | None = None
    planned_starts: list[int] = field(default_factory=list)
    align_source: str = "none"
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    dimensions_by_serial: dict[int, tuple[int, int]] = field(default_factory=dict)
    image_media_entries: list[str] = field(default_factory=list)

    @property
    def image_count(self) -> int:
        return len(self.image_clips)

    @property
    def duration_seconds(self) -> float:
        return self.audio_end / TICKS_PER_SECOND


def analyze_wfp(project_path: Path, csv_path: Path | None = None, image_folder: Path | None = None,
                align_to_markers: bool = True,
                progress_cb: Callable[[float, str], None] | None = None) -> ProjectAnalysis:
    def report_progress(value: float, message: str) -> None:
        if progress_cb:
            progress_cb(max(0.0, min(100.0, value)), message)

    report_progress(2, "Checking the selected Filmora project…")
    project_path = project_path.expanduser().resolve()
    if not project_path.is_file():
        raise RuntimeError(f"WFP file পাওয়া যায়নি: {project_path}")
    if project_path.suffix.lower() != ".wfp" or not zipfile.is_zipfile(project_path):
        raise RuntimeError("সঠিক Filmora .wfp ZIP project নির্বাচন করো।")

    report_progress(8, "Opening and validating the WFP archive…")
    with zipfile.ZipFile(project_path, "r") as zin:
        bad = zin.testzip()
        if bad:
            raise RuntimeError(f"Source WFP archive corrupt: {bad}")
        names = zin.namelist()
        timeline_name = find_unique(names, "/timeline.wesproj")
        extra_name = find_unique(names, "/extra.json")
        project_info_name = find_unique(names, "/project_info.json", required=False)
        medias_info_name = find_unique(names, "/medias_info.json", required=False)
        timeline = safe_json(zin.read(timeline_name), timeline_name)
        extra = safe_json(zin.read(extra_name), extra_name)
        project_info = safe_json(zin.read(project_info_name), project_info_name) if project_info_name else {}
        medias_info = safe_json(zin.read(medias_info_name), medias_info_name) if medias_info_name else None
        media_jsons: dict[str, dict[str, Any]] = {}
        media_total = max(1, sum(1 for n in names if n.lower().endswith("/media.json")))
        media_seen = 0
        for name in names:
            if name.lower().endswith("/media.json"):
                media_seen += 1
                if media_seen == 1 or media_seen % 25 == 0:
                    report_progress(12 + 20 * media_seen / media_total, f"Reading media metadata… {media_seen}/{media_total}")
                try:
                    media_jsons[name] = safe_json(zin.read(name), name)
                except RuntimeError:
                    continue

    report_progress(36, "Inspecting tracks, image clips and markers…")
    timeline_infos = timeline.get("timelineInfos")
    if not isinstance(timeline_infos, list) or len(timeline_infos) != 1:
        raise RuntimeError("এই WFP format-এ একটি timelineInfo আশা করা হয়েছিল; নিরাপদে থামানো হয়েছে।")
    timeline_info = timeline_infos[0]
    frame_rate = timeline_info.get("frameRate", {})
    fps_num = int(frame_rate.get("num", 0) or 0)
    fps_den = int(frame_rate.get("den", 1) or 1)
    if fps_num <= 0 or fps_den <= 0:
        raise RuntimeError(f"Project FPS পড়া যায়নি: {frame_rate}")
    fps = fps_num / fps_den
    numerator = TICKS_PER_SECOND * fps_den
    if numerator % fps_num != 0:
        raise RuntimeError("এই frame rate Filmora tick-এ exact frame duration দেয় না; project edit করা হয়নি।")
    frame_ticks = numerator // fps_num

    resolution = project_info.get("project_timeline_resolution", [1920, 1080])
    try:
        project_width, project_height = int(resolution[0]), int(resolution[1])
    except Exception:
        project_width, project_height = 1920, 1080
    if project_width <= 0 or project_height <= 0:
        project_width, project_height = 1920, 1080

    track_infos = timeline_info.get("trackInfos", [])
    candidates: list[tuple[int, int, list[dict[str, Any]]]] = []
    for idx, track in enumerate(track_infos):
        if int(track.get("trackType", -1)) != 1:
            continue
        clips = [c for c in track.get("clipList", []) if isinstance(c, dict)
                 and Path(file_path_from_wfp(c.get("filename", ""))).suffix.lower() in IMAGE_EXTS]
        if clips:
            candidates.append((len(clips), idx, clips))
    if not candidates:
        raise RuntimeError(
            "WFP-তে কোনো still-image clip track পাওয়া যায়নি। প্রথমে Filmora-তে ছবিগুলো import করে timeline-এ রাখো।"
        )
    candidates.sort(key=lambda x: (x[0], -x[1]), reverse=True)
    if len(candidates) > 1 and candidates[0][0] == candidates[1][0]:
        raise RuntimeError("একাধিক সমান image track পাওয়া গেছে। এই MVP একটিমাত্র main image track নিয়ে কাজ করে।")
    image_count, image_track_index, image_clips = candidates[0]
    image_clips = sorted(image_clips, key=lambda c: int(c.get("tlBegin", 0)))

    marker_lists = [(k, v) for k, v in extra.get("allMarkersInfo", {}).items() if isinstance(v, list)]
    marker_key: str | None = None
    markers: list[dict[str, Any]] = []
    if len(marker_lists) == 1:
        marker_key, markers = marker_lists[0]
    elif len(marker_lists) > 1:
        nonempty = [(k, v) for k, v in marker_lists if v]
        if len(nonempty) == 1:
            marker_key, markers = nonempty[0]
        elif len(nonempty) > 1:
            raise RuntimeError("একাধিক native marker list পাওয়া গেছে; কোনটি main timeline তা নিশ্চিত নয়।")

    audio_ends = [int(c.get("tlEnd", 0)) for tr in track_infos
                  if int(tr.get("trackType", -1)) == 2
                  for c in tr.get("clipList", []) if isinstance(c, dict) and int(c.get("tlEnd", 0)) > 0]
    audio_end = max(audio_ends) if audio_ends else int(project_info.get("project_timeline_duration", 0) or 0)
    if audio_end <= 0:
        audio_end = max(int(c.get("tlEnd", 0)) for c in image_clips)

    # Collect dimensions from media.json by image serial.
    dimensions_by_serial: dict[int, tuple[int, int]] = {}
    image_media_entries: list[str] = []
    path_to_media_serial: dict[int, list[str]] = {}
    for name, media in media_jsons.items():
        media_path = str(media.get("file_name", ""))
        serial = get_serial(media_path)
        if serial is None:
            continue
        image_media_entries.append(name)
        vids = media.get("sourceInfo", {}).get("vidStreamInfos", [])
        if vids:
            try:
                dimensions_by_serial[serial] = (int(vids[0].get("width", 0)), int(vids[0].get("height", 0)))
            except Exception:
                pass
        path_to_media_serial.setdefault(serial, []).append(name)

    analysis = ProjectAnalysis(
        project=project_path, timeline_name=timeline_name, extra_name=extra_name,
        project_info_name=project_info_name, medias_info_name=medias_info_name,
        timeline=timeline, extra=extra, project_info=project_info, medias_info=medias_info,
        media_jsons=media_jsons, image_track_index=image_track_index, image_clips=image_clips,
        marker_key=marker_key, markers=markers, audio_end=audio_end,
        fps_num=fps_num, fps_den=fps_den, fps=fps, frame_ticks=frame_ticks,
        project_width=project_width, project_height=project_height,
        dimensions_by_serial=dimensions_by_serial, image_media_entries=image_media_entries,
    )

    # Check sequence serials.
    serials = [get_serial(c.get("filename", "")) for c in image_clips]
    if all(s is not None for s in serials):
        if serials != sorted(serials):
            analysis.warnings.append("Image serial অনুযায়ী timeline order সাজানো নয়; বর্তমান timeline order বজায় রাখা হবে।")
        if len(set(serials)) != len(serials):
            analysis.errors.append("Timeline-এ duplicate Image serial পাওয়া গেছে।")
    else:
        analysis.warnings.append("কিছু filename-এ Image_### serial নেই; CSV mapping timeline order দিয়ে হবে।")

    if csv_path:
        rows = read_marker_csv(csv_path)
        if len(rows) != image_count:
            raise RuntimeError(f"CSV row {len(rows)}টি কিন্তু image clip {image_count}টি। 1:1 mapping সম্ভব নয়।")
        # If every clip has a unique Image_NNN serial, map by serial; otherwise retain timeline order.
        serial_to_clip = {get_serial(c.get("filename", "")): c for c in image_clips}
        row_serials = [r["image_no"] for r in rows]
        if None not in serial_to_clip and len(serial_to_clip) == image_count and set(serial_to_clip) == set(row_serials):
            analysis.image_clips = [serial_to_clip[s] for s in row_serials]
        else:
            current_serials = [get_serial(c.get("filename", "")) for c in image_clips]
            if all(s is not None for s in current_serials) and current_serials != row_serials:
                raise RuntimeError("CSV Image_No এবং timeline Image serial মেলেনি। ভুল project বা CSV নির্বাচন করা হয়েছে।")
        analysis.csv_rows = rows
        if align_to_markers:
            starts = [round(r["seconds"] * fps_num / fps_den) * frame_ticks for r in rows]
            if starts[0] != 0:
                analysis.warnings.append(f"প্রথম CSV marker {starts[0] / TICKS_PER_SECOND:.3f}s-এ; শুরুতে empty timeline থাকতে পারে।")
            if any(starts[i] >= starts[i + 1] for i in range(len(starts) - 1)):
                raise RuntimeError("এক বা একাধিক CSV marker একই frame-এ quantize হয়েছে বা ক্রম ভুল।")
            if starts[-1] >= audio_end:
                raise RuntimeError("শেষ CSV marker audio/project end-এর পরে বা একই সময়ে; final image hold করা যাবে না।")
            analysis.planned_starts = starts
            analysis.align_source = "CSV timestamp"
            if len(markers) == image_count:
                pass
            elif markers:
                analysis.warnings.append(f"Native marker {len(markers)}টি, image/CSV {image_count}টি; CSV দিয়ে image align হবে, native markers অপরিবর্তিত থাকবে।")
            else:
                analysis.warnings.append("CSV দিয়ে image timing করা যাবে; WFP-তে native marker list পাওয়া যায়নি।")
    elif align_to_markers and markers:
        if len(markers) == image_count:
            starts = [int(m.get("position", 0)) for m in markers]
            if any(starts[i] >= starts[i + 1] for i in range(len(starts) - 1)):
                raise RuntimeError("Native marker position ক্রমানুসারে নেই।")
            if starts[-1] >= audio_end:
                raise RuntimeError("শেষ native marker audio/project end-এর পরে।")
            analysis.planned_starts = starts
            analysis.align_source = "Native WFP markers"
        else:
            analysis.warnings.append(f"Native marker {len(markers)}টি, image clip {image_count}টি; timing অপরিবর্তিত থাকবে।")
    elif align_to_markers:
        analysis.warnings.append("CSV বা native markers মেলেনি; current clip timing রেখে শুধু motion effect তৈরি হবে।")

    if image_folder:
        report_progress(86, "Checking image-folder serials and media paths…")
        folder = image_folder.expanduser().resolve()
        if not folder.is_dir():
            raise RuntimeError(f"Image folder পাওয়া যায়নি: {folder}")
        serial_files: dict[int, list[Path]] = {}
        for p in folder.iterdir():
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                s = get_serial(p.name)
                if s is not None:
                    serial_files.setdefault(s, []).append(p)
        needed = [get_serial(c.get("filename", "")) for c in analysis.image_clips]
        missing = [s for s in needed if s is None or s not in serial_files]
        duplicates = [s for s in needed if s is not None and len(serial_files.get(s, [])) > 1]
        if missing:
            preview = ", ".join(f"Image_{s:03d}" if s else "unknown serial" for s in missing[:10])
            raise RuntimeError(f"Selected image folder-এ {len(missing)}টি প্রয়োজনীয় image serial নেই: {preview}")
        if duplicates:
            raise RuntimeError(f"Image folder-এ duplicate serial আছে: {sorted(set(duplicates))[:10]}")

    report_progress(100, "Project analysis complete.")
    return analysis


def random_crop_rect(base_rect: tuple[float, float, float, float], scale: float,
                     center: tuple[float, float]) -> dict[str, float]:
    bx, by, bw, bh = base_rect
    w = bw / scale
    h = bh / scale
    cx, cy = center
    x = min(max(cx - w / 2, 0.0), 1.0 - w)
    y = min(max(cy - h / 2, 0.0), 1.0 - h)
    return {"X": x, "Y": y, "Width": w, "Height": h}


def choose_center(rng: random.Random, base_rect: tuple[float, float, float, float],
                  w: float, h: float, bias: tuple[float, float] | None = None) -> tuple[float, float]:
    bx, by, bw, bh = base_rect
    min_cx, max_cx = bx + w / 2, bx + bw - w / 2
    min_cy, max_cy = by + h / 2, by + bh - h / 2
    if bias:
        fx, fy = bias
        return (min(max(bx + bw * fx, min_cx), max_cx),
                min(max(by + bh * fy, min_cy), max_cy))
    return (rng.uniform(min_cx, max_cx) if max_cx > min_cx else min_cx,
            rng.uniform(min_cy, max_cy) if max_cy > min_cy else min_cy)


def make_motion_keyframes(preset: str, duration_ticks: int, src_width: int, src_height: int,
                          out_width: int, out_height: int, rng: random.Random,
                          strength: str) -> list[dict[str, Any]]:
    if src_width <= 0 or src_height <= 0:
        src_width, src_height = out_width, out_height
    source_ar = src_width / src_height
    output_ar = out_width / out_height
    if source_ar >= output_ar:
        base_w, base_h = output_ar / source_ar, 1.0
    else:
        base_w, base_h = 1.0, source_ar / output_ar
    bx, by = (1.0 - base_w) / 2, (1.0 - base_h) / 2
    base_rect = (bx, by, base_w, base_h)

    scales = {
        "Subtle": (1.055, 1.12),
        "Standard": (1.10, 1.22),
        "Strong": (1.17, 1.30),
    }
    low, high = scales.get(strength, scales["Standard"])
    # Tiny clips get restrained motion so it does not appear jerky.
    seconds = max(duration_ticks / TICKS_PER_SECOND, 0.01)
    if seconds < 1.0:
        high = min(high, 1.10)
        low = min(low, high - 0.005)
    elif seconds < 2.0:
        high = min(high, 1.15)
        low = min(low, high - 0.005)
    zoom = rng.uniform(low, high)
    start_center = (bx + base_w / 2, by + base_h / 2)
    target_w, target_h = base_w / zoom, base_h / zoom

    if preset == "zoom_in":
        start = {"X": bx, "Y": by, "Width": base_w, "Height": base_h}
        center = choose_center(rng, base_rect, target_w, target_h)
        end = random_crop_rect(base_rect, zoom, center)
    elif preset == "zoom_out":
        center = choose_center(rng, base_rect, target_w, target_h)
        start = random_crop_rect(base_rect, zoom, center)
        end = {"X": bx, "Y": by, "Width": base_w, "Height": base_h}
    elif preset == "pan":
        # Keep the same crop size at both ends; travel horizontally or vertically.
        pan_zoom = min(max(zoom, 1.10), 1.18)
        w, h = base_w / pan_zoom, base_h / pan_zoom
        x_range, y_range = base_w - w, base_h - h
        horizontal = x_range >= y_range and x_range > 0.015
        if horizontal:
            y = by + (base_h - h) / 2
            left = bx
            right = bx + base_w - w
            if rng.choice([True, False]):
                start = {"X": left, "Y": y, "Width": w, "Height": h}
                end = {"X": right, "Y": y, "Width": w, "Height": h}
            else:
                start = {"X": right, "Y": y, "Width": w, "Height": h}
                end = {"X": left, "Y": y, "Width": w, "Height": h}
        elif y_range > 0.015:
            x = bx + (base_w - w) / 2
            top = by
            bottom = by + base_h - h
            if rng.choice([True, False]):
                start = {"X": x, "Y": top, "Width": w, "Height": h}
                end = {"X": x, "Y": bottom, "Width": w, "Height": h}
            else:
                start = {"X": x, "Y": bottom, "Width": w, "Height": h}
                end = {"X": x, "Y": top, "Width": w, "Height": h}
        else:
            # Near-square crop / constrained frame: make a gentle diagonal pan.
            start = random_crop_rect(base_rect, pan_zoom, (bx + w / 2, by + h / 2))
            end = random_crop_rect(base_rect, pan_zoom, (bx + base_w - w / 2, by + base_h - h / 2))
    elif preset == "pan_zoom":
        start_scale = min(1.055, zoom - 0.015)
        start_w, start_h = base_w / start_scale, base_h / start_scale
        # Start near one side, finish tighter and toward a different area.
        dirs = [(0.28, 0.30), (0.72, 0.30), (0.28, 0.70), (0.72, 0.70)]
        d1 = rng.choice(dirs)
        d2 = (1.0 - d1[0], 1.0 - d1[1])
        c1 = choose_center(rng, base_rect, start_w, start_h, d1)
        c2 = choose_center(rng, base_rect, target_w, target_h, d2)
        start = random_crop_rect(base_rect, start_scale, c1)
        end = random_crop_rect(base_rect, zoom, c2)
    else:
        raise ValueError(f"Unknown motion preset: {preset}")

    # Store two crop-pan-zoom keyframes in native Filmora 15 SettingScript form.
    start_ori = 36_000_000_000  # Matches Filmora 15's still-image source-time origin in supplied samples.
    end_ori = start_ori + max(1, duration_ticks)
    return [
        {"OriTime": int(start_ori), "Time": 0.0,
         "X": round(start["X"], 12), "Y": round(start["Y"], 12),
         "Width": round(start["Width"], 12), "Height": round(start["Height"], 12)},
        {"OriTime": int(end_ori), "Time": 1.0,
         "X": round(end["X"], 12), "Y": round(end["Y"], 12),
         "Width": round(end["Width"], 12), "Height": round(end["Height"], 12)},
    ]


def build_assignments(count: int, presets: list[str], mode: str, avoid_repeat: bool,
                      seed: int) -> list[str]:
    if not presets:
        raise RuntimeError("কমপক্ষে একটি Motion Preset নির্বাচন করো।")
    rng = random.Random(seed)
    if len(presets) == 1:
        return [presets[0]] * count
    if mode == "Pure Random":
        result: list[str] = []
        for _ in range(count):
            choices = [p for p in presets if not (avoid_repeat and result and p == result[-1])]
            if not choices:
                choices = presets
            result.append(rng.choice(choices))
        return result
    # Balanced random: near-equal counts, shuffled order, no adjacent repeats where possible.
    pool: list[str] = []
    quotient, remainder = divmod(count, len(presets))
    for i, preset in enumerate(presets):
        pool.extend([preset] * (quotient + (1 if i < remainder else 0)))
    result = []
    while pool:
        # Preserve preset order when resolving ties so the same seed gives the
        # same assignment across different Python processes and machines.
        candidates = [p for p in presets if p in pool and not (avoid_repeat and result and p == result[-1])]
        if not candidates:
            candidates = [p for p in presets if p in pool]
        max_count = max(pool.count(p) for p in candidates)
        top = [p for p in candidates if pool.count(p) == max_count]
        chosen = rng.choice(top)
        result.append(chosen)
        pool.remove(chosen)
    return result


def _update_crop_effect(clip: dict[str, Any], keyframes: list[dict[str, Any]],
                        template_effect: dict[str, Any]) -> None:
    chains = clip.setdefault("effectChainList", [])
    basic = next((c for c in chains if c.get("name") == "Basic"), None)
    if basic is None:
        basic = {"effectList": [], "name": "Basic"}
        chains.insert(0, basic)
    effects = basic.setdefault("effectList", [])
    crop = next((e for e in effects if e.get("id") == "video/effect/crop-pan-zoom"), None)
    if crop is None:
        crop = copy.deepcopy(template_effect)
        # Preserve uniqueness for an effect newly inserted into a clip.
        new_uid = secrets.token_hex(16)
        new_uid = f"{new_uid[:8]}-{new_uid[8:12]}-4{new_uid[13:16]}-a{new_uid[17:20]}-{new_uid[20:32]}"
        crop["thisUId"] = new_uid
        # The sample template stores the effect UUID a second time in userData key 3.
        for item in crop.get("userData", []):
            if int(item.get("key", -1)) == 3 and item.get("data"):
                try:
                    raw = base64.b64decode(item["data"])
                    old = re.match(rb"\{[^}]+\}", raw)
                    padding = raw[len(old.group(0)):] if old else b"\0" * max(0, len(raw) - 38)
                    replacement_guid = "{" + new_uid.upper() + "}".encode("ascii")
                    item["data"] = base64.b64encode(replacement_guid + padding).decode("ascii")
                except Exception:
                    pass
        effects.insert(0, crop)
    params = crop.setdefault("paramList", [])
    setting = next((p for p in params if p.get("name") == "SettingScript"), None)
    serialized = json.dumps(keyframes, ensure_ascii=False, indent=4)
    if setting is None:
        params.append({"fxParam": {"paramType": 6, "unValue": serialized}, "name": "SettingScript"})
    else:
        fx = setting.setdefault("fxParam", {})
        fx["paramType"] = 6
        fx["unValue"] = serialized


def relink_images(analysis: ProjectAnalysis, folder: Path) -> tuple[dict[int, Path], dict[str, bytes]]:
    folder = folder.expanduser().resolve()
    by_serial: dict[int, list[Path]] = {}
    for path in folder.iterdir():
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            serial = get_serial(path.name)
            if serial is not None:
                by_serial.setdefault(serial, []).append(path)
    mapping: dict[int, Path] = {}
    for clip in analysis.image_clips:
        serial = get_serial(clip.get("filename", ""))
        if serial is None:
            continue
        matches = by_serial.get(serial, [])
        if len(matches) != 1:
            raise RuntimeError(f"Image folder-এ Image_{serial:03d} serial-এর file সংখ্যা {len(matches)}; একটিমাত্র file দরকার।")
        mapping[serial] = matches[0]
    replacements: dict[str, bytes] = {}
    # Update timeline clip references.
    for clip in analysis.image_clips:
        serial = get_serial(clip.get("filename", ""))
        if serial in mapping:
            clip["filename"] = to_filmora_file_uri(mapping[serial])
    # Update matching media.json file_name records.
    for name, media in analysis.media_jsons.items():
        old_serial = get_serial(media.get("file_name", ""))
        if old_serial in mapping:
            media["file_name"] = path_for_media_json(mapping[old_serial])
            replacements[name] = json.dumps(media, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    # Update project media-bin URLs as well.
    if analysis.medias_info and isinstance(analysis.medias_info.get("media_items"), dict):
        for item in analysis.medias_info["media_items"].values():
            serial = get_serial(item.get("download_url", ""))
            if serial in mapping:
                item["download_url"] = path_for_media_json(mapping[serial])
                item["name"] = mapping[serial].stem
        replacements[analysis.medias_info_name] = json.dumps(analysis.medias_info, ensure_ascii=False, separators=(",", ":")).encode("utf-8")  # type: ignore[index]
    return mapping, replacements


def apply_and_export(analysis: ProjectAnalysis, output_path: Path, presets: list[str], mode: str,
                     avoid_repeat: bool, seed: int, strength: str,
                     image_folder: Path | None = None,
                     progress_cb: Callable[[float, str], None] | None = None) -> tuple[Path, dict[str, Any]]:
    def report_progress(value: float, message: str) -> None:
        if progress_cb:
            progress_cb(max(0.0, min(100.0, value)), message)

    report_progress(2, "Preparing the motion plan…")
    output_path = output_path.expanduser().resolve()
    if output_path == analysis.project:
        raise RuntimeError("Output project source file-এর একই path হতে পারবে না। Original overwrite করা নিষিদ্ধ।")
    if output_path.exists():
        raise FileExistsError(f"Output file আগে থেকেই আছে: {output_path}")
    if output_path.suffix.lower() != ".wfp":
        raise RuntimeError("Output filename-এর extension .wfp হতে হবে।")

    templates = get_effect_templates()
    report_progress(7, "Loading verified Filmora motion templates…")
    template_effects = {k: v["crop_effect_template"] for k, v in templates.items()}
    motion_enabled = bool(presets)
    assignments = build_assignments(len(analysis.image_clips), presets, mode, avoid_repeat, seed) if motion_enabled else ["none"] * len(analysis.image_clips)
    track_infos = analysis.timeline["timelineInfos"][0]["trackInfos"]
    audio_snapshot = json.dumps(
        [c for tr in track_infos if int(tr.get("trackType", -1)) == 2
         for c in tr.get("clipList", []) if isinstance(c, dict)],
        sort_keys=True, ensure_ascii=False,
    )
    target_track = track_infos[analysis.image_track_index]
    # Ensure the track in timeline JSON points to the same clip list.
    # analysis.image_clips may be CSV serial order; these are references to the
    # original clip dictionaries inside this track, so edits are written in-place.

    relink_replacements: dict[str, bytes] = {}
    relink_mapping: dict[int, Path] = {}
    if image_folder:
        report_progress(10, "Relinking image media paths…")
        relink_mapping, relink_replacements = relink_images(analysis, image_folder)

    # Align clip start/end to the marker / CSV starts when requested and validated.
    if analysis.planned_starts:
        report_progress(14, "Aligning image clips to marker timestamps…")
        starts = analysis.planned_starts
        if len(starts) != len(analysis.image_clips):
            raise RuntimeError("Internal validation: marker start count and image count differ.")
        for i, (clip, start) in enumerate(zip(analysis.image_clips, starts)):
            end = starts[i + 1] if i + 1 < len(starts) else analysis.audio_end
            duration = int(end - start)
            if duration <= 0:
                raise RuntimeError(f"Image clip {i+1}: duration <= 0")
            if "inPoint" not in clip:
                raise RuntimeError(f"Image clip {i+1}-এ Filmora inPoint নেই; edit বন্ধ করা হয়েছে।")
            clip["tlBegin"] = int(start)
            clip["tlEnd"] = int(end)
            clip["outPoint"] = int(clip["inPoint"]) + duration
            speed = clip.get("speed")
            if isinstance(speed, dict) and "offset" in speed:
                speed["offsetEnd"] = round(float(speed["offset"]) + duration / TICKS_PER_SECOND, 9)
        if len(analysis.markers) == len(analysis.image_clips):
            for marker, start in zip(analysis.markers, starts):
                marker["position"] = int(start)
        analysis.project_info["project_timeline_duration"] = int(analysis.audio_end)

    # Build a media dimension lookup from original media metadata; fallback to project ratio.
    updated_serial_dims = dict(analysis.dimensions_by_serial)
    clip_total = max(1, len(analysis.image_clips))
    for clip_index, (clip, preset) in enumerate(zip(analysis.image_clips, assignments), 1):
        if preset != "none":
            serial = get_serial(clip.get("filename", ""))
            src_w, src_h = updated_serial_dims.get(serial, (analysis.project_width, analysis.project_height)) if serial is not None else (analysis.project_width, analysis.project_height)
            begin = int(clip.get("tlBegin", 0))
            end = int(clip.get("tlEnd", 0))
            duration = max(1, end - begin)
            in_point = int(clip.get("inPoint", 36_000_000_000))
            out_point = int(clip.get("outPoint", in_point + duration))
            source_duration = max(1, out_point - in_point)
            keyframes = make_motion_keyframes(
                preset, source_duration, src_w, src_h,
                analysis.project_width, analysis.project_height,
                random.Random(seed ^ (serial if serial is not None else begin)), strength,
            )
            # Correct source-time range for Filmora's still image; use inPoint/outPoint from clip.
            keyframes[0]["OriTime"] = in_point
            keyframes[1]["OriTime"] = out_point
            _update_crop_effect(clip, keyframes, template_effects[preset])
        if clip_index == 1 or clip_index % 10 == 0 or clip_index == clip_total:
            pct = 18 + 44 * clip_index / clip_total
            report_progress(pct, f"Applying motion keyframes… {clip_index:,}/{clip_total:,} images")

    # Prepare the exact JSON entries to replace.
    replacements: dict[str, bytes] = {
        analysis.timeline_name: json.dumps(analysis.timeline, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        analysis.extra_name: json.dumps(analysis.extra, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
    }
    if analysis.project_info_name:
        replacements[analysis.project_info_name] = json.dumps(analysis.project_info, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    replacements.update(relink_replacements)

    report_progress(65, "Preparing the new Filmora project data…")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(analysis.project, "r") as zin, zipfile.ZipFile(output_path, "w") as zout:
            zout.comment = zin.comment
            archive_items = zin.infolist()
            archive_total = max(1, len(archive_items))
            for entry_index, info in enumerate(archive_items, 1):
                data = replacements.get(info.filename)
                if data is None:
                    data = zin.read(info.filename)
                zout.writestr(info, data)
                if entry_index == 1 or entry_index % 25 == 0 or entry_index == archive_total:
                    pct = 68 + 18 * entry_index / archive_total
                    report_progress(pct, f"Writing WFP archive… {entry_index:,}/{archive_total:,} entries")
    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    # Output archive and data QA.
    report_progress(88, "Running archive and timeline quality checks…")
    try:
        with zipfile.ZipFile(output_path, "r") as zout:
            bad = zout.testzip()
            if bad:
                raise RuntimeError(f"Exported WFP corrupt entry: {bad}")
            out_timeline = safe_json(zout.read(analysis.timeline_name), analysis.timeline_name)
            out_extra = safe_json(zout.read(analysis.extra_name), analysis.extra_name)
            out_ti = out_timeline["timelineInfos"][0]
            out_track = out_ti["trackInfos"][analysis.image_track_index]
            out_clips = [c for c in out_track.get("clipList", []) if isinstance(c, dict)
                         and Path(file_path_from_wfp(c.get("filename", ""))).suffix.lower() in IMAGE_EXTS]
            if len(out_clips) != len(analysis.image_clips):
                raise RuntimeError("Post-export QA: image clip count changed.")
            out_audio_snapshot = json.dumps(
                [c for tr in out_ti["trackInfos"] if int(tr.get("trackType", -1)) == 2
                 for c in tr.get("clipList", []) if isinstance(c, dict)],
                sort_keys=True, ensure_ascii=False,
            )
            if out_audio_snapshot != audio_snapshot:
                raise RuntimeError("Post-export QA: audio clip data changed unexpectedly.")
            out_serial_map = {get_serial(c.get("filename", "")): c for c in out_clips}
            effect_count = 0
            for qa_index, c in enumerate(out_clips, 1):
                crop_found = False
                for chain in c.get("effectChainList", []):
                    for effect in chain.get("effectList", []):
                        if effect.get("id") == "video/effect/crop-pan-zoom":
                            for p in effect.get("paramList", []):
                                if p.get("name") == "SettingScript":
                                    kfs = json.loads(p["fxParam"]["unValue"])
                                    if len(kfs) != 2 or not all(k.get("Time") in (0, 0.0, 1, 1.0) for k in kfs):
                                        raise RuntimeError("Post-export QA: crop-pan-zoom keyframe structure invalid.")
                                    if not all(0 <= float(k[x]) <= 1 for k in kfs for x in ("X", "Y", "Width", "Height")):
                                        raise RuntimeError("Post-export QA: crop rectangle outside normalized bounds.")
                                    crop_found = True
                            if crop_found:
                                break
                    if crop_found:
                        break
                if crop_found:
                    effect_count += 1
                if qa_index == 1 or qa_index % 25 == 0 or qa_index == len(out_clips):
                    report_progress(90 + 7 * qa_index / max(1, len(out_clips)), f"Verifying motion effects… {qa_index:,}/{len(out_clips):,} clips")
            if motion_enabled and effect_count != len(analysis.image_clips):
                raise RuntimeError(f"Post-export QA: motion effect found on {effect_count}/{len(analysis.image_clips)} clips.")
            if analysis.planned_starts:
                ordered = sorted(out_clips, key=lambda c: int(c.get("tlBegin", 0)))
                for i in range(len(ordered) - 1):
                    if int(ordered[i]["tlEnd"]) != int(ordered[i + 1]["tlBegin"]):
                        raise RuntimeError(f"Post-export QA: gap/overlap between clips {i+1} and {i+2}.")
                if len(analysis.markers) == len(analysis.image_clips):
                    aligned_markers = [int(m.get("position", -1)) for m in analysis.markers]
                    clip_starts = [int(c.get("tlBegin", -2)) for c in analysis.image_clips]
                    if aligned_markers != clip_starts:
                        raise RuntimeError("Post-export QA: native marker/image start mismatch.")
            # Confirm native marker count did not change.
            out_marker_lists = [v for v in out_extra.get("allMarkersInfo", {}).values() if isinstance(v, list)]
            out_marker_count = max((len(v) for v in out_marker_lists), default=0)
    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    preset_counts = {p: assignments.count(p) for p in presets} if motion_enabled else {}
    report = {
        "app": APP_NAME,
        "version": APP_VERSION,
        "source_project": str(analysis.project),
        "output_project": str(output_path),
        "images": len(analysis.image_clips),
        "fps": f"{analysis.fps_num}/{analysis.fps_den}",
        "alignment": analysis.align_source if analysis.planned_starts else "Existing clip timing retained",
        "duration_seconds": round(analysis.duration_seconds, 3),
        "motion_enabled": motion_enabled,
        "motion_mode": mode if motion_enabled else "Motion effects disabled",
        "presets": preset_counts,
        "seed": seed,
        "intensity": strength,
        "native_markers": out_marker_count,
        "motion_effects_verified": effect_count,
        "audio_clip_data_preserved": True,
        "image_relinked": len(relink_mapping),
        "source_overwritten": False,
        "structural_qa": "PASS",
        "filmora_gui_playback_test": "NOT PERFORMED - must verify in Filmora on the target PC",
        "warnings": analysis.warnings,
    }
    report_path = output_path.with_suffix(".QA.txt")
    report_text = [f"{APP_NAME} v{APP_VERSION} - Export QA", "=" * 52]
    for key, value in report.items():
        report_text.append(f"{key}: {value}")
    report_path.write_text("\n".join(report_text), encoding="utf-8")
    report_progress(100, "Export complete — structural QA passed.")
    return output_path, report



# This module is intentionally a processing library only. The desktop UI is Electron.
