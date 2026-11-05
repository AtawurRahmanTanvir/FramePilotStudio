import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type CounterRevealProps = {
  from: number;
  to: number;
  startFrame: number;
  endFrame: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export const CounterReveal: React.FC<CounterRevealProps> = ({
  from, to, startFrame, endFrame, prefix = '', suffix = '', decimals = 0,
}) => {
  const frame = useCurrentFrame();
  const safeEnd = Math.max(startFrame + 1, endFrame);
  const value = interpolate(frame, [startFrame, safeEnd], [from, to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <span>{prefix}{value.toFixed(decimals)}{suffix}</span>;
};
