'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { DeskScene, DeskSceneProps } from './DeskScene';

export function RegistryDeskCanvas(props: DeskSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: props.isMobile ? [0, 7.6, 6.2] : [0, 6.2, 5.4],
          fov: props.isMobile ? 50 : 42,
          near: 0.1,
          far: 50,
        }}
        shadows
        dpr={[1, 1.75]} // Cap pixel ratio at 1.75 as per performance specification
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <DeskScene {...props} />
      </Canvas>
    </div>
  );
}
