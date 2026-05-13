import React from 'react';
import { Composition } from 'remotion';
import { HokyInventoryCommercial } from './HokyInventoryCommercial';

export const RemotionRoot = () => {
  return (
    <Composition
      id="HokyInventoryCommercial"
      component={HokyInventoryCommercial}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
