import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type ProgressRailProps = {durationInFrames: number; track: string; fill: string; height?: number};

export const ProgressRail: React.FC<ProgressRailProps> = ({durationInFrames, track, fill, height = 4}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{width: '100%', height, background: track, overflow: 'hidden'}}>
      <div style={{width: `${progress}%`, height: '100%', background: fill}} />
    </div>
  );
};
