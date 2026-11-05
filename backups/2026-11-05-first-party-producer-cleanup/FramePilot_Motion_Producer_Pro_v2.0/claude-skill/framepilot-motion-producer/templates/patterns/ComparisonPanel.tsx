import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type Side = {heading: string; value: string; detail: string; accent: string};
type ComparisonPanelProps = {left: Side; right: Side; dividerColor: string};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({left, right, dividerColor}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  const sides = [left, right];
  return (
    <div style={{display: 'flex', gap: 32, opacity}}>
      {sides.map((side) => (
        <section key={side.heading} style={{flex: 1, padding: 38, border: `1px solid ${dividerColor}`, borderTop: `5px solid ${side.accent}`, borderRadius: 14, background: 'rgba(255,255,255,0.04)'}}>
          <div style={{fontSize: 20, letterSpacing: 2, color: side.accent, fontWeight: 700}}>{side.heading}</div>
          <div style={{fontSize: 58, color: '#FFFFFF', fontWeight: 800, marginTop: 34}}>{side.value}</div>
          <div style={{fontSize: 24, lineHeight: 1.4, color: '#C5CDD2', marginTop: 18}}>{side.detail}</div>
        </section>
      ))}
    </div>
  );
};
