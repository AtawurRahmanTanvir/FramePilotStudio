import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

type SceneTextProps = {
  eyebrow: string;
  title: string;
  body: string;
  accent?: string;
};

export const SceneText: React.FC<SceneTextProps> = ({eyebrow, title, body, accent = theme.colors.accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, Math.round(fps * 0.8))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(progress, [0, 1], [28, 0]);

  return (
    <div style={{
      position: 'absolute',
      left: theme.spacing.edge,
      right: theme.spacing.edge,
      top: '50%',
      transform: `translateY(calc(-50% + ${rise}px))`,
      opacity: progress,
      fontFamily: theme.typography.body,
      color: theme.colors.text,
    }}>
      <div style={{color: accent, fontSize: 22, fontWeight: 700, letterSpacing: 4, marginBottom: 28}}>{eyebrow.toUpperCase()}</div>
      <div style={{fontSize: 82, lineHeight: 1.04, fontWeight: 800, maxWidth: 1420, letterSpacing: -2}}>{title}</div>
      <div style={{color: theme.colors.muted, fontSize: 30, lineHeight: 1.4, maxWidth: 1080, marginTop: 34}}>{body}</div>
    </div>
  );
};
