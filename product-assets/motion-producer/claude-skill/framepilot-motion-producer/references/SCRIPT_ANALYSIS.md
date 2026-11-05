# SCRIPT_ANALYSIS.md
# FramePilot Motion Producer — Script Analysis Methodology

## Purpose

This document defines the complete methodology Claude uses to parse and analyze a documentary script before scene planning. Script analysis outputs feed directly into the editorial plan and scene map.

---

## Full Script Parsing Methodology

### Pass 1: Structural Segmentation

Divide the script into **sections** based on function:

| Tag | Detection Signal | Description |
|-----|-----------------|-------------|
| `intro` | First 10% of script, before first evidence claim | Opening framing, thesis statement |
| `exposition` | Background context, historical setting | "In the year...", "Before the...", date references |
| `evidence` | Statistics, quotes, named sources | Numbers, citations, direct quotes |
| `turning-point` | Pivot language | "However", "Despite", "But then", "Until" |
| `revelation` | Climactic claim | Strongest factual assertion of the script |
| `conclusion` | Final 8-12% | Resolution, call-to-action, closing statement |

### Pass 2: Sentence Boundary Detection

1. Split on `.`, `?`, `!` followed by whitespace and a capital letter.
2. Do **not** split on decimal numbers (`3.5 million`), abbreviations (`Dr.`, `No.`, `Prof.`), or ellipses (`...`).
3. Each sentence is a candidate scene unit. Consecutive sentences may be grouped if their combined duration < 20s.
4. Record sentence boundaries as word index ranges using the CSV word list.

### Pass 3: Named Entity Extraction

Extract and categorize:

```json
{
  "people": ["Sheikh Mujibur Rahman", "Yahya Khan", "Indira Gandhi"],
  "places": ["Dhaka", "Bangladesh", "East Pakistan", "Chittagong"],
  "dates": ["March 25, 1971", "December 16, 1971", "nine months"],
  "organizations": ["Mukti Bahini", "Pakistani Army", "United Nations"],
  "objects": ["liberation war", "independence", "Operation Searchlight"]
}
```

**Rules:**
- People: Use full name on first occurrence. Subsequent scenes may use last name only.
- Places: If a place is unknown to general audiences, flag for potential map scene.
- Dates: Every date becomes a potential title card or timeline element.
- Organizations: First mention gets full name; abbreviation thereafter.

---

## Factual Claim Identification

A **factual claim** is any statement with a verifiable number, statistic, or attribution.

Detection signals:
- Numeric characters (`3 million`, `47%`, `1971`)
- Comparative superlatives ("largest", "deadliest", "first")
- Attribution markers ("according to", "reported by", "UN estimates")

### Source-Grounding Rules

1. Only display factual claims that appear explicitly in the script or supplied assets.
2. **Never fabricate** statistics, adjust numbers for visual convenience, or introduce external data.
3. If a number is ambiguous (e.g., "millions died"), use the script's phrasing verbatim — do not substitute a specific number.
4. Record each factual claim with its source (script line reference) in the editorial plan.

> ⛔ Anti-pattern: Rounding "3.1 million" to "3 million" in a data visualization. Use the script's exact figure.

---

## Sentiment and Tone Arc Mapping

For each section of the script, assign a tone value on two axes:

**Emotional intensity**: `low | medium | high | peak`
**Valence**: `positive | neutral | negative | mixed`

### Tone Arc Example

```json
{
  "toneArc": [
    { "section": "intro",        "intensity": "low",    "valence": "neutral" },
    { "section": "exposition",   "intensity": "medium",  "valence": "negative" },
    { "section": "evidence",     "intensity": "high",   "valence": "negative" },
    { "section": "turning-point","intensity": "peak",   "valence": "mixed" },
    { "section": "revelation",   "intensity": "high",   "valence": "positive" },
    { "section": "conclusion",   "intensity": "medium",  "valence": "positive" }
  ]
}
```

The tone arc drives:
- **Motion speed**: higher intensity → faster cuts and more kinetic motion
- **Color temperature**: negative valence → cooler, desaturated; positive → warmer
- **Typography weight**: peak intensity → bold/heavy weights

---

## Speaker Identification

### Detection Rules

1. **Named attribution**: `"According to Dr. Rahman..."` or `"Dr. Rahman says:"` → speaker = `dr-rahman`
2. **Dialogue markers**: Opening quote followed by attribution — `"We will not surrender." — General X`
3. **Script labels**: If the script uses `[NARRATOR]`, `[SPEAKER 1]` labels, use them directly.
4. **Pronoun tracking**: After a named speaker is introduced, pronouns (`he said`, `she recalled`) refer to that speaker until another name appears.

### Speaker Registry (build during Pass 3)

```json
{
  "speakers": [
    {
      "id": "narrator",
      "name": "Narrator",
      "firstWordIndex": 0,
      "occurrences": [{"start": 0, "end": 42}, {"start": 118, "end": 165}]
    },
    {
      "id": "rahman",
      "name": "Sheikh Mujibur Rahman",
      "firstWordIndex": 43,
      "occurrences": [{"start": 43, "end": 117}]
    }
  ]
}
```

---

## Key Phrase Extraction

Key phrases are the 5–15 word sequences most suitable for **typography overlays** — large-text display during the narration of that phrase.

### Selection Criteria (rank in order)
1. First and last sentence of each section
2. Statistics and their immediate context (`"3 million people fled their homes"`)
3. Direct quotes attributed to named speakers
4. Any sentence containing superlatives or extreme comparatives
5. Rhetorical questions in the script

### Typography Display Rules for Key Phrases
- Display key phrase text during the word index range it occupies in the CSV.
- Use `Display` or `Section` typography hierarchy (see `VISUAL_DIRECTION_SYSTEM.md`).
- Never show more than 12 words simultaneously at Display scale.
- If a key phrase exceeds 12 words, split at a natural syntactic boundary.

---

## Quote Identification and Handling

A **quote** is a direct speech attributed to a specific person.

### Detection
- Opening `"` or `'` followed by content and a closing `"` or `'`
- Block-indented text in the script
- Attribution markers: `said`, `stated`, `recalled`, `declared`, `argued`

### Quote Display Rules
1. Show the quoted text in a `quote-card` scene type.
2. Attribution line appears below the quote, in Caption hierarchy.
3. Format: `— Full Name, Title/Year` (use whatever the script provides)
4. Opening quotation mark rendered large (decorative `"` at 400% scale)
5. Quote text uses italic style.
6. If a quote exceeds 25 words, display only the most impactful portion — mark the truncation with `[…]`.

> ⛔ Anti-pattern: Displaying a 60-word quote in full. Audiences cannot read that fast during voiceover. Extract the 15-20 word core.

---

## Numbers, Statistics, and Percentages — Display Rules

| Type | Display Format | Scene Type |
|------|---------------|------------|
| Large count (`3 million`) | Animated counter | `data` |
| Percentage (`47%`) | Donut/percentage display | `data` |
| Year (`1971`) | Title card or timeline | `timeline` or `title-card` |
| Range (`1947–1971`) | Timeline bar | `timeline` |
| Ratio (`1 in 5`) | Simple fraction display | `data` |
| Currency | Static text (no animation) | `exposition` |

**Formatting rules:**
- Numbers < 10: spell out in typography (`three`, not `3`) — unless it is a year or statistic
- Numbers ≥ 10: use numerals (`42`)
- Thousands separator: use commas (`3,000,000`)
- Percentages: use `%` symbol, not "percent"

---

## Language Detection

1. Detect primary language of the script using character frequency analysis.
2. Supported primary languages: English (`en`), Bengali (`bn`).
3. Record secondary languages present (mixed-script scripts).
4. Language detection result goes into `source-inventory.json`.

### Bengali-Specific Rules

> ⚠️ **Critical**: Bengali script must **never** be split into individual Unicode code points for display purposes.

- Bengali text uses Unicode range `U+0980`–`U+09FF`.
- **Do not** split Bengali words at arbitrary character positions. Bengali conjunct consonants (যুক্তাক্ষর) are multi-codepoint sequences that form single glyphs. Breaking them produces mojibake.
- Always use the full word as the display unit.
- Font requirement: a Bengali-supporting font must be loaded (e.g., Hind Siliguri, Noto Sans Bengali). Record font requirement in asset manifest.
- Line-breaking: break only at word boundaries (space characters), never mid-word.
- Text direction: left-to-right (same as English for Bengali).

**Example safe split:**
```
"মুক্তিযুদ্ধ বাংলাদেশ"
// Split at space → ["মুক্তিযুদ্ধ", "বাংলাদেশ"] ✓
// Never: ["মু", "ক্তি", "যু", "দ্ধ"] ✗
```

---

## Script vs. Voiceover Mismatch Handling

Sometimes the voiceover recording differs slightly from the final script (omitted words, added fillers, changed phrasing).

### Detection
- Compare word count: script words vs. CSV word count. If difference > 5%, flag as potential mismatch.
- Look for words in the script that do not appear in the CSV word list.

### Resolution Rules
1. **CSV is canonical for timing**. Use CSV word sequence for timing-locked typography.
2. **Script is canonical for story**. Use script text for editorial planning and key phrase extraction.
3. When a key phrase from the script does not appear in the CSV, do not display it as word-synced text — use it as a held caption instead.
4. Record mismatch count and resolution in the decision log.

---

## Script Section Tagging Output

After analysis, produce a tagged section map:

```json
{
  "sections": [
    {
      "tag": "intro",
      "wordIndexStart": 0,
      "wordIndexEnd": 38,
      "startMs": 0,
      "endMs": 15200,
      "summary": "Establishes the year 1971 and the beginning of the Liberation War"
    },
    {
      "tag": "exposition",
      "wordIndexStart": 39,
      "wordIndexEnd": 142,
      "startMs": 15200,
      "endMs": 58400,
      "summary": "Historical context: Operation Searchlight, civilian casualties"
    },
    {
      "tag": "evidence",
      "wordIndexStart": 143,
      "wordIndexEnd": 287,
      "startMs": 58400,
      "endMs": 124000,
      "summary": "Death toll statistics, refugee crisis numbers, international response"
    },
    {
      "tag": "turning-point",
      "wordIndexStart": 288,
      "wordIndexEnd": 310,
      "startMs": 124000,
      "endMs": 132000,
      "summary": "Indian military intervention changes the course of the war"
    },
    {
      "tag": "revelation",
      "wordIndexStart": 311,
      "wordIndexEnd": 368,
      "startMs": 132000,
      "endMs": 158000,
      "summary": "December 16, 1971: surrender and independence"
    },
    {
      "tag": "conclusion",
      "wordIndexStart": 369,
      "wordIndexEnd": 408,
      "startMs": 158000,
      "endMs": 187400,
      "summary": "Legacy and remembrance of the Liberation War"
    }
  ]
}
```

---

## Cross-References

- How sections map to scenes → `SCENE_PLANNING.md`
- How story beats are identified → `STORY_ARCHITECTURE.md`
- Typography display of key phrases → `VISUAL_DIRECTION_SYSTEM.md`
- Bengali font requirements → `TYPOGRAPHY_AND_MULTILINGUAL.md`
- Quote scene type → `SCENE_PLANNING.md`
