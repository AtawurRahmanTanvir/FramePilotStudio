import React from 'react';

type CalloutLineProps = {x1: number; y1: number; x2: number; y2: number; label: string; color: string; width?: number};

export const CalloutLine: React.FC<CalloutLineProps> = ({x1, y1, x2, y2, label, color, width = 1920}) => (
  <svg viewBox={`0 0 ${width} 1080`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
    <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={color} strokeWidth={2} fill="none" />
    <circle cx={x1} cy={y1} r={6} fill={color} />
    <text x={x2 + 12} y={y2 - 10} fill={color} fontSize={20} fontWeight={700}>{label}</text>
  </svg>
);
