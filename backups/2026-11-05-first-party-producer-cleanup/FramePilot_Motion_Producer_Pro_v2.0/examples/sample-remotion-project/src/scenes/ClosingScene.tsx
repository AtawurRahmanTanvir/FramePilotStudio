import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {SectionMarker} from '../components/SectionMarker';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.background, justifyContent: 'center', padding: `0 ${theme.spacing.edge}px`}}>
      <div style={{opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [18, 0])}px)`}}>
        <div style={{color: theme.colors.accentCool, fontSize: 20, fontWeight: 700, letterSpacing: 4}}>THE TAKEAWAY</div>
        <div style={{color: theme.colors.text, fontSize: 76, fontWeight: 800, maxWidth: 1380, lineHeight: 1.08, marginTop: 26}}>Design the sequence around the idea, not around the effect.</div>
      </div>
      <SectionMarker index="03" label="The conclusion" />
    </AbsoluteFill>
  );
};
