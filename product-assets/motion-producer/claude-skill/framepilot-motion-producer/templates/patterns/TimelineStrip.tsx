import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type TimelineEvent = {id: string; label: string; frame: number; color: string};
type TimelineStripProps = {events: TimelineEvent[]; durationInFrames: number; trackColor: string};

export const TimelineStrip: React.FC<TimelineStripProps> = ({events, durationInFrames, trackColor}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'relative', width: '100%', paddingTop: 26}}>
      <div style={{height: 3, background: trackColor, width: '100%'}} />
      <div style={{position: 'absolute', top: 26, left: 0, height: 3, width: `${progress}%`, background: '#FFFFFF'}} />
      {events.map((event) => {
        const left = Math.max(0, Math.min(100, (event.frame / Math.max(1, durationInFrames)) * 100));
        return (
          <div key={event.id} style={{position: 'absolute', left: `${left}%`, top: 18, transform: 'translateX(-50%)', textAlign: 'center'}}>
            <div style={{width: 18, height: 18, borderRadius: 99, background: event.color, border: '3px solid #FFFFFF', margin: '0 auto'}} />
            <div style={{marginTop: 12, whiteSpace: 'nowrap', color: '#FFFFFF', fontSize: 18}}>{event.label}</div>
          </div>
        );
      })}
    </div>
  );
};
