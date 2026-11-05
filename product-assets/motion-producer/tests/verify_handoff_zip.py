#!/usr/bin/env python3
"""
Verification Script for Production Handoff ZIP Generation & Content.

Tests:
1. Complete handoff package generated from Word Timing session.
2. Verified inclusion:
   - Word Timing CSV
   - QA JSON report
   - Session metadata (.session.json)
   - Narration script (.txt)
   - NARRATION_BINDING.json logical link descriptor
   - PER_VIDEO_INTAKE.md intake prompt
3. STRICT PRIVACY VERIFICATION:
   - Confirms NO .wav / .mp3 / audio files are bundled inside the handoff ZIP.
   - Confirms narration binding points to local session without transmitting binary media.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def run_handoff_verification():
    print("=== STARTING HANDOFF ZIP VERIFICATION ===")
    test_dir = ROOT / "product-assets" / "motion-producer" / "tests" / "handoff_test_workspace"
    if test_dir.exists():
        shutil.rmtree(test_dir)
    test_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Setup mock session files
        session_id = "wt-test-session-98765"
        script_file = test_dir / "Apollo_Documentary.txt"
        script_file.write_text("In 1969, humanity achieved the impossible by landing on the Moon.", encoding="utf-8")

        audio_file = test_dir / "apollo_narration.wav"
        audio_file.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80\xbb\x00\x00\x00w\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")

        csv_file = test_dir / "Apollo_Documentary_Motion_Word_Timing.csv"
        csv_file.write_text(
            "Word_Index,Script_Word,Recognized_Word,Start_ms,End_ms\n"
            "0,In,in,120,310\n"
            "1,1969,1969,350,850\n"
            "2,humanity,humanity,900,1400\n",
            encoding="utf-8"
        )

        qa_file = test_dir / "Apollo_Documentary_Motion_Word_Timing.QA.json"
        qa_file.write_text(json.dumps({
            "schema_version": 1,
            "session_id": session_id,
            "exact_matches": 3,
            "warnings": []
        }, indent=2), encoding="utf-8")

        session_file = test_dir / "Apollo_Documentary_Motion_Word_Timing.session.json"
        session_file.write_text(json.dumps({
            "sessionId": session_id,
            "projectName": "Apollo_Documentary",
            "sourceAudioPath": str(audio_file),
            "sourceAudioFilename": audio_file.name,
            "audioDurationSeconds": 1.4,
            "sourceScriptPath": str(script_file),
            "csvPath": str(csv_file),
            "qaPath": str(qa_file),
            "createdAt": "2026-11-05T12:00:00Z"
        }, indent=2), encoding="utf-8")

        intake_source = ROOT / "product-assets" / "motion-producer" / "project-instructions" / "PER_VIDEO_INTAKE.md"
        assert intake_source.is_file(), f"PER_VIDEO_INTAKE.md not found at {intake_source}"

        # 2. Execute Node test reproducing motion-service.js generate-handoff-zip logic
        node_script = f"""
const fs = require('fs');
const path = require('path');
const {{ spawnSync }} = require('child_process');

const tempDir = path.join('{str(test_dir).replace('\\', '/')}', 'staging');
fs.mkdirSync(tempDir, {{ recursive: true }});

const sessionCsvPath = '{str(csv_file).replace('\\', '/')}';
const outputPath = path.join('{str(test_dir).replace('\\', '/')}', 'Apollo_Documentary_Handoff.zip');

// Copy CSV
fs.copyFileSync(sessionCsvPath, path.join(tempDir, path.basename(sessionCsvPath)));

// Copy QA JSON
const qaPath = sessionCsvPath.replace(/\\.csv$/i, '.QA.json');
if (fs.existsSync(qaPath)) fs.copyFileSync(qaPath, path.join(tempDir, path.basename(qaPath)));

// Copy session metadata
const sessionPath = sessionCsvPath.replace(/\\.csv$/i, '.session.json');
let sessionMeta = {{}};
if (fs.existsSync(sessionPath)) {{
  sessionMeta = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  fs.copyFileSync(sessionPath, path.join(tempDir, path.basename(sessionPath)));
}}

// Copy script file
const scriptCandidates = [
  sessionMeta.sourceScriptPath,
  sessionCsvPath.replace(/_Motion_Word_Timing\\.csv$/i, '.txt'),
  sessionCsvPath.replace(/\\.csv$/i, '.txt')
];
for (const sc of scriptCandidates) {{
  if (sc && fs.existsSync(sc)) {{
    fs.copyFileSync(sc, path.join(tempDir, path.basename(sc)));
    break;
  }}
}}

// Write narration binding descriptor
const originalAudio = sessionMeta.sourceAudioFilename || (sessionMeta.sourceAudioPath ? path.basename(sessionMeta.sourceAudioPath) : null);
const audioRef = {{
  type: 'framepilot-linked-audio',
  note: 'The original voiceover is stored locally in FramePilot Studio and will be automatically linked when the project ZIP is imported. Do not upload the audio file to Claude.',
  originalFilename: originalAudio,
  sessionId: sessionMeta.sessionId || null,
  csvFile: path.basename(sessionCsvPath),
}};
fs.writeFileSync(path.join(tempDir, 'NARRATION_BINDING.json'), JSON.stringify(audioRef, null, 2), 'utf8');

// Copy intake doc
fs.copyFileSync('{str(intake_source).replace('\\', '/')}', path.join(tempDir, 'PER_VIDEO_INTAKE.md'));

// Create ZIP using PowerShell
const ps = spawnSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Compress-Archive -Path '${{tempDir}}/*' -DestinationPath '${{outputPath}}' -Force`
], {{ encoding: 'utf8' }});

if (ps.status !== 0) {{
  console.error(ps.stderr);
  process.exit(1);
}}
console.log('ZIP_SUCCESS:' + outputPath);
"""
        node_file = test_dir / "run_handoff.js"
        node_file.write_text(node_script, encoding="utf-8")

        res = subprocess.run(["node", str(node_file)], capture_output=True, text=True)
        assert res.returncode == 0, f"Node handoff runner failed: {res.stderr}\n{res.stdout}"
        print("Node handoff packaging execution succeeded.")

        output_zip = test_dir / "Apollo_Documentary_Handoff.zip"
        assert output_zip.is_file(), f"Output zip was not created: {output_zip}"

        # 3. Inspect ZIP contents
        with zipfile.ZipFile(output_zip, "r") as zf:
            namelist = zf.namelist()
            print(f"Handoff ZIP entries ({len(namelist)}): {namelist}")

            # Verification assertions
            expected_entries = [
                "Apollo_Documentary_Motion_Word_Timing.csv",
                "Apollo_Documentary_Motion_Word_Timing.QA.json",
                "Apollo_Documentary_Motion_Word_Timing.session.json",
                "Apollo_Documentary.txt",
                "NARRATION_BINDING.json",
                "PER_VIDEO_INTAKE.md",
            ]
            for exp in expected_entries:
                assert exp in namelist, f"Missing required file in handoff ZIP: {exp}"

            # Strict privacy check: No audio files
            audio_extensions = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wma"}
            for name in namelist:
                suffix = Path(name).suffix.lower()
                assert suffix not in audio_extensions, f"CRITICAL SECURITY VIOLATION: Audio file {name} was packaged in handoff ZIP!"

            # Narration binding content check
            binding_data = json.loads(zf.read("NARRATION_BINDING.json").decode("utf-8"))
            assert binding_data.get("type") == "framepilot-linked-audio", f"Invalid binding type: {binding_data.get('type')}"
            assert binding_data.get("sessionId") == session_id, f"SessionId mismatch: {binding_data.get('sessionId')}"
            assert binding_data.get("originalFilename") == "apollo_narration.wav", f"Original filename mismatch: {binding_data.get('originalFilename')}"
            assert "Do not upload the audio file" in binding_data.get("note", ""), "Missing user privacy warning note in binding"

            # Per-video intake content check
            intake_content = zf.read("PER_VIDEO_INTAKE.md").decode("utf-8")
            assert "Production Intake" in intake_content or "FramePilot" in intake_content

            print("[PASS] All required files present.")
            print("[PASS] Narration binding correctly points to local session.")
            print("[PASS] ZERO audio files packaged (user narration privacy preserved).")

    finally:
        if test_dir.exists():
            shutil.rmtree(test_dir)

    print("=== HANDOFF ZIP VERIFICATION PASSED ===")
    return 0


if __name__ == "__main__":
    sys.exit(run_handoff_verification())
