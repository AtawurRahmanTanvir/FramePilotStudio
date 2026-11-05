import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type SectionHeaderProps = {kicker: string; title: string; accent: string; maxWidth?: number};

export const SectionHeader: React.FC<SectionHeaderProps> = ({kicker, title, accent, maxWidth = 1420}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <header style={{opacity: p, transform: `translateY(${(1 - p) * 24}px)`, maxWidth}}>
      <div style={{color: accent, fontSize: 19, fontWeight: 700, letterSpacing: 3}}>{kicker.toUpperCase()}</div>
      <h2 style={{color: '#FFFFFF', fontSize: 68, lineHeight: 1.08, margin: '22px 0 0', fontWeight: 800}}>{title}</h2>
    </header>
  );
};
