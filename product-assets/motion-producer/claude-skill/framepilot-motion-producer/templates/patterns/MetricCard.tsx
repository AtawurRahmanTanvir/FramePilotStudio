import React from 'react';

type MetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  sourceLabel: string;
  note?: string;
  accent: string;
};

export const MetricCard: React.FC<MetricCardProps> = ({label, value, unit, sourceLabel, note, accent}) => (
  <section style={{padding: 32, minWidth: 260, borderLeft: `5px solid ${accent}`, background: 'rgba(255,255,255,0.05)'}}>
    <div style={{fontSize: 18, color: '#C5CDD2', letterSpacing: 1.5}}>{label}</div>
    <div style={{fontSize: 58, lineHeight: 1.05, color: '#FFFFFF', fontWeight: 800, fontVariantNumeric: 'tabular-nums', marginTop: 18}}>
      {value}{unit ? <span style={{fontSize: 24, marginLeft: 8}}>{unit}</span> : null}
    </div>
    {note ? <div style={{fontSize: 20, color: '#C5CDD2', marginTop: 14}}>{note}</div> : null}
    <div style={{fontSize: 14, color: accent, marginTop: 22}}>SOURCE: {sourceLabel}</div>
  </section>
);
