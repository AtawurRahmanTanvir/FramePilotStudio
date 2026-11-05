import React from 'react';

type SourceFootnoteProps = {source: string; note?: string; color?: string};

export const SourceFootnote: React.FC<SourceFootnoteProps> = ({source, note, color = '#A9B8C2'}) => (
  <div style={{fontSize: 15, lineHeight: 1.35, color, maxWidth: 760}}>
    <div>{source}</div>
    {note ? <div style={{opacity: 0.78, marginTop: 4}}>{note}</div> : null}
  </div>
);
