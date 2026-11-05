import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {SectionMarker} from '../components/SectionMarker';

const steps = [
  {number: '01', title: 'Source', detail: 'Establish what is known.'},
  {number: '02', title: 'Mechanism', detail: 'Explain how the change happens.'},
  {number: '03', title: 'Consequence', detail: 'Show why the mechanism matters.'},
];

export const MechanismScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.background, padding: `170px ${theme.spacing.edge}px`}}>
      <div style={{color: theme.colors.accent, fontFamily: theme.typography.label, fontSize: 20, letterSpacing: 4, fontWeight: 700}}>THE EXPLANATION</div>
      <div style={{fontSize: 60, fontWeight: 800, color: theme.colors.text, marginTop: 24}}>Make the mechanism visible.</div>
      <div style={{display: 'flex', gap: 26, marginTop: 92}}>
        {steps.map((step, index) => {
          const local = Math.max(0, frame - index * 10);
          const opacity = interpolate(local, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
          const y = interpolate(local, [0, 20], [24, 0], {extrapolateRight: 'clamp'});
          return (
            <div key={step.number} style={{flex: 1, minHeight: 330, padding: 34, backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.line}`, borderRadius: 16, opacity, transform: `translateY(${y}px)`}}>
              <div style={{color: theme.colors.accent, fontSize: 20, fontWeight: 700}}>{step.number}</div>
              <div style={{color: theme.colors.text, fontSize: 42, fontWeight: 800, marginTop: 50}}>{step.title}</div>
              <div style={{color: theme.colors.muted, fontSize: 24, lineHeight: 1.35, marginTop: 18}}>{step.detail}</div>
            </div>
          );
        })}
      </div>
      <SectionMarker index="02" label="The mechanism" />
    </AbsoluteFill>
  );
};
