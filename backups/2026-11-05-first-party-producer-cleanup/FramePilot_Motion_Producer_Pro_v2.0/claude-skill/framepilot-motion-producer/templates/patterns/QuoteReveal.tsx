import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type QuoteRevealProps = {quote: string; attribution: string; accent: string};

export const QuoteReveal: React.FC<QuoteRevealProps> = ({quote, attribution, accent}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 22], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{maxWidth: 1300, opacity: progress, transform: `translateY(${(1 - progress) * 18}px)`}}>
      <div style={{fontSize: 104, lineHeight: 0.7, color: accent, fontFamily: 'Georgia, serif'}}>“</div>
      <blockquote style={{margin: 0, color: '#FFFFFF', fontSize: 52, fontWeight: 600, lineHeight: 1.22}}>{quote}</blockquote>
      <div style={{marginTop: 32, color: accent, fontSize: 20, letterSpacing: 2, fontWeight: 700}}>{attribution}</div>
    </div>
  );
};
