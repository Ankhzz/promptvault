'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Cylinder, Torus } from '@react-three/drei'
import * as THREE from 'three'

export function VaultModel() {
  const groupRef = useRef<THREE.Group>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const isDesktop = useRef(true)
  const handleRef = useRef<THREE.Group>(null)
  const twitch = useRef({ nextAt: 24, active: false, startTime: 0, duration: 0.75 })

  useEffect(() => {
    isDesktop.current = !('ontouchstart' in window)

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDesktop.current) return
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('mousemove', handleMouseMove)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        mouseRef.current = { x: 0, y: 0 }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    const safeDelta = Math.min(delta, 0.033)
    const t = state.clock.elapsedTime

    const idleY = 0.3 + Math.sin(t * 0.3) * 0.02
    const idleX = 0.15 + Math.sin(t * 0.2 + 0.5) * 0.015

    const parallaxY = mouseRef.current.x * 0.015
    const parallaxX = mouseRef.current.y * 0.012

    const targetY = idleY + parallaxY
    const targetX = idleX + parallaxX

    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * safeDelta * 1.8
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * safeDelta * 1.8

    groupRef.current.position.y = Math.sin(t * 0.4) * 0.03

    accentMat.emissiveIntensity = 0.2 + Math.sin(t * 0.5) * 0.05

    if (!handleRef.current) return

    if (twitch.current.active) {
      const elapsed = t - twitch.current.startTime
      const p = elapsed / twitch.current.duration
      if (p >= 1) {
        handleRef.current.rotation.z = 0
        twitch.current.active = false
        const r = 0.5 + 0.5 * Math.sin(t * 1001)
        twitch.current.nextAt = t + 18 + r * 12
      } else {
        handleRef.current.rotation.z = Math.sin(p * Math.PI) * 0.015
      }
    } else if (t >= twitch.current.nextAt) {
      const r = 0.5 + 0.5 * Math.sin(t * 1001)
      twitch.current.duration = 0.6 + r * 0.3
      twitch.current.startTime = t
      twitch.current.active = true
    }
  })

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#1a1a1a',
    metalness: 0.7,
    roughness: 0.3,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
  })

  const doorMat = new THREE.MeshPhysicalMaterial({
    color: '#262626',
    metalness: 0.65,
    roughness: 0.35,
    clearcoat: 0.1,
  })

  const doorInsetMat = new THREE.MeshPhysicalMaterial({
    color: '#2e2e2e',
    metalness: 0.5,
    roughness: 0.5,
  })

  const metalMat = new THREE.MeshPhysicalMaterial({
    color: '#3a3a3a',
    metalness: 0.8,
    roughness: 0.2,
  })

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: '#3b9eff',
    metalness: 0.4,
    roughness: 0.3,
    emissive: '#3b9eff',
    emissiveIntensity: 0.2,
  })

  return (
    <group ref={groupRef} rotation={[0.15, 0.3, 0]}>
      {/* Main vault body */}
      <RoundedBox args={[2.6, 2.2, 1.8]} radius={0.06} smoothness={4}>
        <primitive object={bodyMat} attach="material" />
      </RoundedBox>

      {/* Door */}
      <RoundedBox args={[2.2, 1.8, 0.08]} position={[0, 0, 0.94]} radius={0.04} smoothness={4}>
        <primitive object={doorMat} attach="material" />
      </RoundedBox>

      {/* Door inset panel */}
      <RoundedBox args={[1.8, 1.4, 0.04]} position={[0, 0, 1.0]} radius={0.04} smoothness={4}>
        <primitive object={doorInsetMat} attach="material" />
      </RoundedBox>

      {/* Dial outer ring */}
      <Torus args={[0.2, 0.035, 16, 48]} position={[0, 0.2, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={metalMat} attach="material" />
      </Torus>

      {/* Dial inner highlight ring */}
      <Torus args={[0.19, 0.01, 12, 48]} position={[0, 0.2, 1.06]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={accentMat} attach="material" />
      </Torus>

      {/* Dial center */}
      <Cylinder args={[0.12, 0.12, 0.04, 32]} position={[0, 0.2, 1.07]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={metalMat} attach="material" />
      </Cylinder>

      {/* Handle — grouped for micro mechanical twitch */}
      <group ref={handleRef} position={[0, -0.35, 1.02]}>
        {/* Handle bar */}
        <RoundedBox args={[0.5, 0.06, 0.06]} position={[0, 0, 0]} radius={0.03} smoothness={4}>
          <primitive object={metalMat} attach="material" />
        </RoundedBox>

        {/* Handle grips */}
        {[-0.22, 0.22].map((x) => (
          <Cylinder key={`grip-${x}`} args={[0.04, 0.04, 0.1, 12]} position={[x, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
            <primitive object={metalMat} attach="material" />
          </Cylinder>
        ))}
      </group>

      {/* Hinges */}
      {[-0.7, 0, 0.7].map((y, i) => (
        <group key={`hinge-${i}`}>
          <Cylinder args={[0.04, 0.04, 0.12, 12]} position={[-1.15, y * 0.55, 0.45]} rotation={[0.3, 0, Math.PI / 2]}>
            <primitive object={metalMat} attach="material" />
          </Cylinder>
          <Cylinder args={[0.04, 0.04, 0.12, 12]} position={[-1.15, y * 0.55, -0.45]} rotation={[-0.3, 0, Math.PI / 2]}>
            <primitive object={metalMat} attach="material" />
          </Cylinder>
        </group>
      ))}

      {/* Lock bolts on right side */}
      {[-0.3, 0.3].map((y, i) => (
        <RoundedBox key={`bolt-${i}`} args={[0.04, 0.08, 0.08]} position={[1.15, y * 0.3, 0.6]} radius={0.02} smoothness={3}>
          <primitive object={metalMat} attach="material" />
        </RoundedBox>
      ))}
    </group>
  )
}
