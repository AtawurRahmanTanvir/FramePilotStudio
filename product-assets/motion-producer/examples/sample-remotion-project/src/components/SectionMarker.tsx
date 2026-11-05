import React from 'react';
import {theme} from '../theme';

type SectionMarkerProps = {index: string; label: string};

export const SectionMarker: React.FC<SectionMarkerProps> = ({index, label}) => (
  <div style={{position: 'absolute', right: theme.spacing.edge, bottom: 86, display: 'flex', gap: 16, alignItems: 'center', color: theme.colors.muted, fontFamily: theme.typography.label, fontSize: 18, letterSpacing: 2}}>
    <span style={{color: theme.colors.accent, fontWeight: 700}}>{index}</span>
    <span style={{width: 42, height: 1, background: theme.colors.line}} />
    <span>{label.toUpperCase()}</span>
  </div>
);
