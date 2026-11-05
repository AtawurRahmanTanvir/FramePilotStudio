import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type StaggerItem = {id: string; title: string; detail: string};
type StaggerListProps = {items: StaggerItem[]; staggerFrames?: number; accent: string};

export const StaggerList: React.FC<StaggerListProps> = ({items, staggerFrames = 8, accent}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'grid', gap: 22}}>
      {items.map((item, index) => {
        const localFrame = Math.max(0, frame - index * staggerFrames);
        const opacity = interpolate(localFrame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
        const y = interpolate(localFrame, [0, 18], [18, 0], {extrapolateRight: 'clamp'});
        return (
          <div key={item.id} style={{display: 'grid', gridTemplateColumns: '12px 1fr', gap: 18, opacity, transform: `translateY(${y}px)`}}>
            <div style={{background: accent, borderRadius: 8}} />
            <div>
              <div style={{fontSize: 30, color: '#FFFFFF', fontWeight: 700}}>{item.title}</div>
              <div style={{fontSize: 21, color: '#C5CDD2', marginTop: 6}}>{item.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
