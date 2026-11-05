# Typography, Captions and Multilingual Rendering

## Typographic system

Define display, body, label, numeric and caption roles in `src/theme.ts`. Each role includes font family, weight, size range, line height, letter spacing and maximum line width. Use local fonts only and include license/source notes in `project-data/asset-manifest.json`.

## Reading hierarchy

- One display headline or focal phrase per scene.
- Secondary labels should be visibly subordinate.
- Use short text fragments; do not paste the full narration onto the screen.
- Use a consistent case and punctuation policy.
- Use tabular numerals for counters, dates and data labels.
- Use contrast and spacing before outlines, drop shadows or glow.

## Bengali and complex scripts

- Never split Bengali into Unicode code points and animate individual characters.
- Animate whole words, syllable-safe groups, phrases or masked text containers.
- Preserve conjuncts, reph, kar, phala, vowel signs and punctuation as a shaped text run.
- Use a font with a verified Bengali shaping stack. If the bundled environment has not been tested with the selected font, mark it `NOT VERIFIED`.
- Do not claim Bengali typography support merely because a Bengali string can be stored in JSON.
- Test mixed Bengali/Latin numerals and punctuation for baseline, wrapping and glyph fallback.

## Text safe areas

Specify safe regions for 16:9, 9:16 and 1:1 separately. Keep essential text away from the frame edges and platform overlays. Do not assume a landscape composition can be cropped into portrait without a separate layout plan.

## Word-synced captions

- CSV `Recognized_Word` is the spoken text authority.
- Do not replace spoken words with the intended script word when they differ.
- Phrase-level captions may group words but retain word intervals for optional active-word emphasis.
- Respect natural punctuation and pauses.
- Keep a predictable line length; prefer 1–2 lines unless the format requires otherwise.
- Never create SRT or VTT as a substitute timing format.
- Caption off means no caption layer, not no timing data.

## Font fallback and layout checks

Include a fallback family and record the chosen font file. Do not rely on a system-only font with no declaration. Static QA should flag missing font files, unsupported characters known from the selected font metadata, and text containers without max-width constraints. Actual shaping and final visual appearance remain unverified until a real local render is viewed.
