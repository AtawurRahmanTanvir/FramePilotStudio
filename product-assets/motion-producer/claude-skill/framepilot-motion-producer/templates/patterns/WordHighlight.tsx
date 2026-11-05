import React from 'react';
import {useCurrentFrame} from 'remotion';

type TimedWord = {wordIndex: number; text: string; startFrame: number; endFrameExclusive: number};
type WordHighlightProps = {
  words: TimedWord[];
  activeColor: string;
  inactiveColor: string;
  separator?: string;
};

export const WordHighlight: React.FC<WordHighlightProps> = ({words, activeColor, inactiveColor, separator = ' '}) => {
  const frame = useCurrentFrame();
  return (
    <span>
      {words.map((word, index) => {
        const active = frame >= word.startFrame && frame < word.endFrameExclusive;
        return (
          <React.Fragment key={word.wordIndex}>
            {index > 0 ? separator : ''}
            <span style={{color: active ? activeColor : inactiveColor}}>{word.text}</span>
          </React.Fragment>
        );
      })}
    </span>
  );
};
