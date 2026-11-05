# Data Visualization & Quantitative Information Design

## 1. Editorial Integrity for Data

In documentary motion design, data visualizations must inform and elucidate, never mislead or embellish.

### Strict Data Rules
1. **Source Grounding**: Visualize only numbers, years, percentages, or metrics directly stated in the approved script or verified project brief.
2. **Zero Fabrication**: Never invent dummy data points to make a chart look fuller. If a dataset has only 3 points, visualize 3 points with elegant spacing.
3. **Scale Baseline**: Always start bar charts and volume comparisons at zero unless an explicit range break is prominently annotated.

---

## 2. Animated Counter Component

For statistics, financial figures, and historical dates:

```tsx
import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';

interface AnimatedCounterProps {
  fromValue: number;
  toValue: number;
  startFrame?: number;
  durationInFrames?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  fromValue,
  toValue,
  startFrame = 0,
  durationInFrames = 45,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const frame = useCurrentFrame();

  const currentVal = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [fromValue, toValue],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  const formatted = decimals > 0 ? currentVal.toFixed(decimals) : Math.round(currentVal).toLocaleString();

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
      {prefix}{formatted}{suffix}
    </span>
  );
};
```

---

## 3. Kinetic Bar Chart Component

```tsx
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface BarItem {
  label: string;
  value: number; // 0 to 100 percentage
  displayValue: string;
}

export const KineticBarChart: React.FC<{ items: BarItem[]; startFrame?: number }> = ({
  items,
  startFrame = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'grid', gap: 16, width: 720 }}>
      {items.map((item, idx) => {
        const itemStart = startFrame + idx * 8;
        const progress = spring({
          frame: frame - itemStart,
          fps,
          config: { damping: 16, stiffness: 90 },
        });

        const widthPct = interpolate(progress, [0, 1], [0, item.value], { extrapolateRight: 'clamp' });
        const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div key={item.label} style={{ opacity, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#d0ae6d' }}>
              <span>{item.label}</span>
              <span style={{ fontWeight: 700, color: '#f2eee6' }}>{item.displayValue}</span>
            </div>
            <div style={{ width: '100%', height: 10, background: '#1e1c18', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #96622a, #d8ad62)',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 4. Kinetic Typography for Quotes & Key Claims

- Highlight keywords in sequence with narration arrival.
- Animate key phrases with a subtle translateY rise (8px -> 0px) and opacity fade (0 -> 1) over 12 frames.
- Anchor source attribution (e.g. "— Dr. Robert Oppenheimer, 1945") with a distinct muted color (`#8f8778`) and tabular formatting.

