# Sound Design & Procedural SFX Generation

## 1. Automated Sound Design Philosophy

**The user is never asked to source sound effects.**

Claude generates original sound-effect assets using the canonical first-party procedural SFX synthesis engine:
`scripts/generate_sfx.py`

This generator uses purely standard-library Python to synthesize original, high-fidelity PCM WAV audio assets without external API costs or copyrighted third-party sample packs.

---

## 2. Supported Effect Families & Production Use Cases

| Family | Default Duration | Synthesis Profile | Editorial Motivation |
|---|---|---|---|
| `whoosh` | 0.65s | Filtered noise sweep + resonant tonal core | Visual transitions, rapid camera movement, graphic wipe |
| `transition` | 0.45s | Soft harmonic glide with Gaussian envelope | Section changes, chapter heading fades |
| `impact` | 0.35s | Sub-bass punch (90Hz -> 40Hz) + snap transient | Significant headline reveals, thesis punctuation |
| `hit` | 0.55s | Low-frequency rumble (38Hz - 62Hz) with long decay | Dramatic conflict turning points |
| `riser` | 1.20s | Multi-oscillator exponential pitch buildup | Building narrative tension before revelation |
| `reverse-sweep` | 0.90s | Reverse suction envelope with sharp cutoff | Flashbacks, retrospective pivots |
| `click` | 0.12s | High-frequency mechanical burst (15ms decay) | Data counter tick, chronological date change, UI accent |
| `metallic` | 0.50s | Inharmonic bell chime resonance modes | Industrial themes, historical hardware, structural focus |
| `shutter` | 0.18s | Dual-impulse curtain click-clack | Archival photo reveals, document photography |
| `paper` | 0.60s | Modulated friction noise rustle | Archival document unfold, map unfurl |
| `ui-tone` | 0.20s | Crisp harmonic major chord triad | Digital metrics, positive confirmation markers |
| `ambience` | 2.00s | Deep drone bed with subtle phase drift | Atmospheric continuity, cold open background bed |
| `reveal` | 0.80s | Cinematic chord swell into high shimmer | Title card emergence, documentary climax |

---

## 3. Invoking the SFX Engine

In normal production, Claude executes:

```bash
# Generate all required assets for the project
python scripts/generate_sfx.py public/sfx --all --seed 42 --channels 2

# Or generate specific individual cues with custom durations:
python scripts/generate_sfx.py public/sfx --family whoosh --seed 1 --duration 0.5
python scripts/generate_sfx.py public/sfx --family impact --seed 2 --peak 0.85
```

The script writes:
1. `public/sfx/<family>_<seed>.wav` (Standard 16-bit PCM WAV, 48kHz, mono or stereo).
2. `public/sfx/SFX_MANIFEST.json` containing verified timing, peak, duration, and file size metadata.

---

## 4. Remotion Audio Placement Pattern

In Remotion, sound effects are placed using `<Audio>` components with frame-precise `startFrom` offsets and volume ducking:

```tsx
import { Audio, staticFile, Sequence } from 'remotion';

export const SoundDesignTrack: React.FC = () => {
  return (
    <>
      {/* Cold open whoosh transition */}
      <Sequence from={0} durationInFrames={20}>
        <Audio src={staticFile('sfx/whoosh_42.wav')} volume={0.40} />
      </Sequence>

      {/* Dramatic title impact at frame 45 */}
      <Sequence from={45} durationInFrames={30}>
        <Audio src={staticFile('sfx/impact_42.wav')} volume={0.65} />
      </Sequence>

      {/* Data counter tick at frame 120 */}
      <Sequence from={120} durationInFrames={10}>
        <Audio src={staticFile('sfx/click_42.wav')} volume={0.30} />
      </Sequence>
    </>
  );
};
```

---

## 5. Mix Discipline Rules

1. **Narration Primacy**: Narration is the sovereign audio element. Sound effects must never mask spoken words. Keep SFX peak levels between $-12\text{dB}$ and $-24\text{dB}$ relative to narration.
2. **Motivated Sound Only**: Never place an impact or whoosh on every cut. Silence is an essential dramatic tool.
3. **No Background Music by Default**: Unless the user explicitly provides or requests a music bed, do not synthesize or bundle background music.

