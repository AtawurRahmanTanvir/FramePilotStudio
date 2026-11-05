import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneText} from '../components/SceneText';
import {SectionMarker} from '../components/SectionMarker';
import {theme} from '../theme';

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 22, mass: 1.1, stiffness: 72}});
  const ruleWidth = interpolate(reveal, [0, 1], [0, 620]);

  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.background}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 78% 28%, ${theme.colors.surfaceRaised} 0%, ${theme.colors.background} 48%)`}} />
      <div style={{position: 'absolute', left: theme.spacing.edge, top: 200, width: ruleWidth, height: 4, backgroundColor: theme.colors.accent}} />
      <SceneText eyebrow="FramePilot Motion Producer" title="A story is a system of decisions." body="This starter composition demonstrates hierarchy, restrained movement and a modular scene structure." />
      <SectionMarker index="01" label="The premise" />
    </AbsoluteFill>
  );
};
