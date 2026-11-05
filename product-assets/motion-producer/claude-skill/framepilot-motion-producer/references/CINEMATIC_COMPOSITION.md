# Cinematic Composition & Framing

## 1. Cinematic Framing Principles

Documentary motion design requires cinematic intention in every frame. Avoid flat, static slide presentations by applying the visual vocabulary of master documentary filmmaking.

### Focal Point & Rule of Thirds
- Align key subjects (eyes of portrait subjects, focal points of historical artifacts, apex of statistical trends) along the upper or lower third intersection lines.
- Leave ample lead room (look space) in the direction of the subject's gaze or movement vector.

### Depth Stratification (Three-Plane Rule)
Every major scene should establish visual depth across three distinct layers:
1. **Foreground (FG)**: Subtle framing elements (out-of-focus archival borders, light leaks, delicate measurement lines).
2. **Midground (MG)**: Primary narrative subject (document, character portrait, schematic drawing).
3. **Background (BG)**: Textured base, contextual environment, or dark vignetted spatial field.

---

## 2. Parallax and Motion Mechanics

When applying virtual camera moves in Remotion, assign proportional velocities to create realistic optical parallax:

```tsx
import { interpolate, useCurrentFrame } from 'remotion';

export const ParallaxStage: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Foreground moves fastest (optical proximity)
  const fgTranslateX = interpolate(frame, [0, durationInFrames], [0, -45], { extrapolateRight: 'clamp' });
  // Midground moves at base velocity
  const mgTranslateX = interpolate(frame, [0, durationInFrames], [0, -20], { extrapolateRight: 'clamp' });
  // Background moves slowest (infinite distance)
  const bgTranslateX = interpolate(frame, [0, durationInFrames], [0, -6], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden' }}>
      <div style={{ transform: `translateX(${bgTranslateX}px)` }} className="bg-layer" />
      <div style={{ transform: `translateX(${mgTranslateX}px)` }} className="mg-layer" />
      <div style={{ transform: `translateX(${fgTranslateX}px)` }} className="fg-layer" />
    </div>
  );
};
```

---

## 3. Lighting & Vignetting

- **Vignette Control**: Apply subtle radial falloffs on backgrounds:
  `background: radial-gradient(ellipse at center, #1b1915 0%, #09090a 75%)`
- **Focus Falloff**: Use CSS `filter: blur(...)` sparingly on non-focal layers (e.g. 2px to 4px on background elements) to direct audience eye gaze toward the primary narrative element.

---

## 4. Visual Balance

- **Asymmetry**: Prefer dynamic asymmetrical arrangements (e.g., text block aligned on the left third balanced by an archival document on the right third) over generic center-stacked layouts.
- **Negative Space**: Allow at least 35% of the frame to remain open negative space. Cluttered layouts fatigue viewers and reduce narrative impact.

