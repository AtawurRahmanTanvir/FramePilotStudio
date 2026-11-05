# Camera & Depth Engineering in Remotion

## 1. Virtual Camera System Architecture

Remotion does not feature a native 3D viewport or OpenGL camera matrix. Instead, virtual camera movement is engineered using deterministic 2D/3D CSS transforms (`scale()`, `translate3d()`, `rotateY()`, and `perspective`).

### Supported Camera Maneuvers

| Maneuver | Typical Duration | Scale Amplitude | Offset Amplitude | Typical Easing |
|---|---|---|---|---|
| **Slow Push-In** (Ken Burns) | 120 - 300 frames | $1.00 \to 1.06$ | $(0, 0) \to (-15, -10)\text{px}$ | `linear` or gentle `easeInOutQuad` |
| **Controlled Pull-Out** | 150 - 360 frames | $1.07 \to 1.00$ | $(10, 15) \to (0, 0)\text{px}$ | `linear` |
| **Horizontal Tracking / Pan** | 90 - 240 frames | Constant $1.03$ | $X: 0 \to -120\text{px}$ | `easeInOutCubic` |
| **Perspective Rack** | 45 - 90 frames | Constant $1.00$ | `rotateY(6deg) -> rotateY(0deg)` | `spring({damping: 18, stiffness: 80})` |

---

## 2. Reusable Virtual Camera Wrapper

```tsx
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface CameraRigProps {
  durationInFrames: number;
  type: 'push' | 'pull' | 'pan-right' | 'pan-left' | 'static';
  amplitude?: number;
  children: React.ReactNode;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  durationInFrames,
  type,
  amplitude = 1.0,
  children,
}) => {
  const frame = useCurrentFrame();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (type === 'push') {
    scale = interpolate(frame, [0, durationInFrames], [1.0, 1.0 + 0.06 * amplitude], {
      extrapolateRight: 'clamp',
    });
    translateY = interpolate(frame, [0, durationInFrames], [0, -8 * amplitude], {
      extrapolateRight: 'clamp',
    });
  } else if (type === 'pull') {
    scale = interpolate(frame, [0, durationInFrames], [1.0 + 0.06 * amplitude, 1.0], {
      extrapolateRight: 'clamp',
    });
  } else if (type === 'pan-right') {
    scale = 1.04;
    translateX = interpolate(frame, [0, durationInFrames], [0, -60 * amplitude], {
      extrapolateRight: 'clamp',
    });
  } else if (type === 'pan-left') {
    scale = 1.04;
    translateX = interpolate(frame, [0, durationInFrames], [0, 60 * amplitude], {
      extrapolateRight: 'clamp',
    });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        transformOrigin: '50% 50%',
        transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};
```

---

## 3. Scale Amplitude Discipline

1. **Max Scale Ceiling**: Never exceed $1.10$ scale ($10\%$ magnification). Magnification beyond $10\%$ exposes pixel interpolation artifacts on 1080p source imagery.
2. **Smooth Acceleration**: Avoid abrupt speed jumps. Always use continuous derivatives or smooth spring damping curves.
3. **Motion Lock Rule**: For complex data visualizers, financial tables, or dense architectural blueprints, lock the camera (`type: 'static'`) for at least 60 frames during the initial reading phase before applying secondary push moves.

