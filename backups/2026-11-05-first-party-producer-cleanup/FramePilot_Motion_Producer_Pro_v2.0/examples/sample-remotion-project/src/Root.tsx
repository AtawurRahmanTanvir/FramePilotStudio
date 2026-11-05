import React from 'react';
import {Composition, Sequence} from 'remotion';
import {OpeningScene} from './scenes/OpeningScene';
import {MechanismScene} from './scenes/MechanismScene';
import {ClosingScene} from './scenes/ClosingScene';

const MainComposition: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={240} name="Opening">
      <OpeningScene />
    </Sequence>
    <Sequence from={240} durationInFrames={420} name="Mechanism">
      <MechanismScene />
    </Sequence>
    <Sequence from={660} durationInFrames={240} name="Closing">
      <ClosingScene />
    </Sequence>
  </>
);

export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={MainComposition}
    durationInFrames={900}
    fps={30}
    width={1920}
    height={1080}
  />
);
