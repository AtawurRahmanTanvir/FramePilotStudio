import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type ImageMotionProps = {src: string; mode?: 'locked' | 'slow_push' | 'slow_pull'; startScale?: number; endScale?: number; alt?: string};

export const ImageMotion: React.FC<ImageMotionProps> = ({src, mode = 'locked', startScale = 1, endScale = 1.06, alt}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const scale = mode === 'locked' ? 1 : mode === 'slow_pull'
    ? interpolate(progress, [0, 1], [endScale, startScale])
    : interpolate(progress, [0, 1], [startScale, endScale]);
  return <Img src={staticFile(src)} alt={alt} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}} />;
};
