# Visual Direction & Design Tokens System

## 1. Design Tokens Architecture

Every FramePilot Motion project adheres to a restrained, premium documentary aesthetic. The design system relies on a consistent token hierarchy.

### Color Tokens

```json
{
  "colors": {
    "background": {
      "base": "#0a0a0c",
      "surface": "#121216",
      "surfaceElevated": "#181820",
      "overlay": "rgba(10, 10, 12, 0.85)"
    },
    "text": {
      "primary": "#f2eee6",
      "secondary": "#a8a296",
      "muted": "#6a665d",
      "inverted": "#0a0a0c"
    },
    "accent": {
      "gold": "#d0ae6d",
      "goldGlow": "rgba(208, 174, 109, 0.18)",
      "ruby": "#df8a8d",
      "emerald": "#a8c49a",
      "slate": "#7c828d"
    },
    "border": {
      "subtle": "#262420",
      "medium": "#3d3932",
      "focus": "#d0ae6d"
    }
  }
}
```

---

## 2. Typography Rules

1. **Hierarchy**:
   - **Display / Title**: Large serif or clean geometric sans-serif (e.g. `Cinzel`, `Inter`, `Playfair Display`). Weight 600-700. Letter-spacing: -0.02em to +0.05em.
   - **Section Headers**: Sans-serif uppercase with wide letter spacing (+0.12em). Weight 800. Font size 12-14px equivalent.
   - **Body / Prose**: Highly legible grotesque sans-serif (e.g. `Inter`, `Roboto`). Line-height 1.6 to 1.75.
   - **Metadata / Citations**: Monospace or small sans (9-11px). Color muted `#827c70`.
2. **Safe Areas**:
   - Title safe area: 10% inset from all screen edges (192px horizontal, 108px vertical at 1080p).
   - No critical text or data points may sit outside the title safe zone.
3. **Multilingual & Bengali Support**:
   - Never split complex scripts (e.g. Bengali, Hindi, Arabic) into individual graphemes or characters for sequential reveal animations. Animate words or whole lines as atomic SVG/text elements to preserve ligatures and matras.

---

## 3. Spatial Composition & Grid

- Standard resolution: **1920 × 1080** (16:9 widescreen).
- 12-column layout grid with 32px gutters and 96px outer margins.
- **Z-Index Layering Order**:
  - `0`: Background gradient / base color
  - `10`: Subtle background texture / grid lines / ambient particles
  - `20`: Midground visuals (photographs, maps, document scans)
  - `30`: Foreground graphics (charts, framing borders, callout lines)
  - `40`: Primary kinetic typography & captions
  - `50`: Film grain / subtle lens vignette overlay

---

## 4. Visual Restraint & Anti-Patterns

> ⛔ **Anti-pattern: Template Glitz & Rainbow Accents**
> Avoid spinning 3D elements, colorful particle explosions, neon gradients, or generic social media template tropes. The visual tone must reflect authoritative, high-craft documentary cinema.

> ⛔ **Anti-pattern: Low-Contrast Typography**
> Always verify that text meets minimum contrast ratios (at least 4.5:1 against any moving background). Use subtle dark scrims or blurred backplates behind text elements.

