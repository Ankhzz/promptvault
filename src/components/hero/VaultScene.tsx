'use client'

import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { VaultModel } from './VaultModel'

export function VaultScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: 3, toneMappingExposure: 1.4 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 6, 3]} intensity={2.5} />
        <directionalLight position={[-3, 2, -2]} intensity={1} color="#3b9eff" />
        <directionalLight position={[-2, -1, -4]} intensity={0.8} color="#9281f7" />
        <pointLight position={[0, -2, 2]} intensity={0.4} />

        <VaultModel />

        <EffectComposer>
          <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.4} intensity={0.15} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
