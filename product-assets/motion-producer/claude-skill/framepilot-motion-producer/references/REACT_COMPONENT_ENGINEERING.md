# React Component Engineering for Remotion 4.0.540

## 1. Component Directory Architecture

Projects generated for FramePilot Studio adhere strictly to modular React component conventions:

```
src/
├── index.tsx              # Remotion registration entry point
├── Root.tsx               # Composition declarations (<Composition>)
├── theme.ts               # Design tokens, typography & color constants
├── scenes/                # Full-scene components
│   ├── Scene01Opening.tsx
│   ├── Scene02Exposition.tsx
│   ├── Scene03Data.tsx
│   └── Scene04Closing.tsx
├── components/            # Reusable UI primitives
│   ├── CameraRig.tsx
│   ├── SceneText.tsx
│   ├── KineticCounter.tsx
│   └── SectionMarker.tsx
└── audio/                 # Sound and narration track coordinators
    └── SoundDesign.tsx
```

---

## 2. Root Composition Contract (`src/Root.tsx`)

Every project must declare at least one primary composition whose ID matches `compositionId` in `motion-project.json`:

```tsx
import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import scenePlan from '../project-data/scene-plan.json';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={MainVideo}
      durationInFrames={scenePlan.totalDurationInFrames}
      fps={scenePlan.fps}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};
```

And registration entry in `src/index.tsx`:

```tsx
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

---

## 3. Dependency Pinning & Import Rules

FramePilot's bundled offline runtime pins exact package versions:
- `react`: `"19.1.0"`
- `react-dom`: `"19.1.0"`
- `remotion`: `"4.0.540"`
- `@remotion/player`: `"4.0.540"`
- `@remotion/transitions`: `"4.0.540"`
- `@remotion/motion-blur`: `"4.0.540"`
- `@remotion/captions`: `"4.0.540"`
- `@remotion/compositor-win32-x64-msvc`: `"4.0.540"`

### Critical Code Quality Rules
- **No Remote Network Requests**: Do not use `fetch()`, `axios`, or dynamic asset URLs inside components. All assets must be bundled in `public/` and loaded via `staticFile()`.
- **Pure Render Functions**: Avoid side effects, mutable global state, `Math.random()` during render, or `Date.now()`. Use Remotion's `random(seed)` utility for deterministic variation.
- **Memoization**: Wrap heavy path calculations in `useMemo()` or precalculate vectors.
- **Strict CSS Units**: Always specify explicit pixel values or percentages in style objects.

