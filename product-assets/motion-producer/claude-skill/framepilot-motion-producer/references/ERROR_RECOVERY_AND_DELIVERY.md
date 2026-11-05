# Error Recovery & Delivery Protocol

## 1. Error Classification Matrix

When generating or inspecting Remotion projects, distinguish clearly between blocking defects, non-blocking discrepancies, and advisory notices:

| Level | Condition | Required Action |
|---|---|---|
| **BLOCKING** | Missing `motion-project.json` or `package.json` | Abort ZIP packaging; fix root configuration |
| **BLOCKING** | Unsafe file paths (path traversal `..`, absolute drive paths) | Strip or sanitize paths before ZIP creation |
| **BLOCKING** | Remotion version mismatch ($\neq 4.0.540$) | Revert dependency to pinned $4.0.540$ runtime |
| **BLOCKING** | Declared entry point missing or invalid syntax | Fix TSX syntax and verify export |
| **NON-BLOCKING** | Word Timing CSV contains untimed rows | Retain rows with empty timestamps; flag in `STATIC_QA_REPORT.md` |
| **NON-BLOCKING** | Word Timing script mismatch (speech $\neq$ text) | Retain verbatim recognized text; log in QA report |
| **NON-BLOCKING** | Local narration session ID not found | Emit warning; allow manual staging during/after import |
| **ADVISORY** | Optional user logo not provided | Use clean typographic title card instead; document assumption |

---

## 2. Decision Log Protocol (`project-data/decision-log.json`)

Whenever Claude makes an editorial choice or recovers from an ambiguity, record the rationale in `project-data/decision-log.json`:

```json
{
  "decisions": [
    {
      "timestamp": "2026-11-05T12:00:00Z",
      "category": "audio-resolution",
      "issue": "No explicit session ID provided in input brief",
      "resolution": "Adopted logical binding with originalFilename matching CSV sidecar",
      "impact": "FramePilot import will attempt heuristic filename match"
    },
    {
      "category": "visual-pacing",
      "issue": "Script has a 4.2s pause between paragraph 2 and 3",
      "resolution": "Inserted subtle atmospheric drone and slow camera push on archival document",
      "impact": "Maintains visual interest during spoken silence"
    }
  ]
}
```

---

## 3. Required Final Hand-Off Message

Upon successfully packaging and delivering the project ZIP, always include the canonical FramePilot handoff notice:

> **Final video not rendered by Claude.**
>
> 1. Download the generated project ZIP.
> 2. Open **FramePilot Studio** and navigate to **Motion Studio → Project Import**.
> 3. Select the project ZIP. FramePilot will automatically validate the package, resolve your local narration audio, and add it to your library.
> 4. Go to **Render Video** and click **RENDER VIDEO** to produce your final MP4 locally.

