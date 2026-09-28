import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import ModelSlot from './ModelSlot'
import { useDome, surfaceHeightAt } from '../domeContext'

/**
 * Piecyk ("koza") z kominem wyprowadzonym przez poszycie.
 * Pozycję pieca liczymy względem obrysu podstawy; komin sięga zawsze
 * 0,7 m ponad powierzchnię kopuły, niezależnie od średnicy.
 */
export default function Stove({ meta }) {
  const ctx = useDome()
  const { R, dome, night } = ctx
  const baseR = dome.baseRadius * R
  const x = -baseR * 0.32
  const z = -baseR * 0.5
  const d = Math.hypot(x, z)
  const stoveTop = 0.78
  const roof = surfaceHeightAt(ctx, d)
  const pipeTop = roof + 0.7
  const pipeLen = pipeTop - stoveTop

  return (
    <group position={[x, 0, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
      <ModelSlot url={meta.model} fallback={<StovePlaceholder night={night} />} />
      {/* komin (zostaje proceduralny – jego długość zależy od średnicy kopuły) */}
      <mesh position={[0, stoveTop + pipeLen / 2, -0.05]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, pipeLen, 16]} />
        <meshStandardMaterial color="#2c2c2e" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* kołnierz przejścia przez poszycie */}
      <mesh position={[0, roof, -0.05]}>
        <cylinderGeometry args={[0.16, 0.2, 0.08, 16]} />
        <meshStandardMaterial color="#7d7f83" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* daszek komina */}
      <mesh position={[0, pipeTop + 0.08, -0.05]} castShadow>
        <coneGeometry args={[0.15, 0.12, 16]} />
        <meshStandardMaterial color="#2c2c2e" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

function StovePlaceholder({ night }) {
  const light = useRef()
  useFrame(({ clock }) => {
    if (!light.current) return
    const t = clock.elapsedTime
    light.current.intensity = (night ? 2.2 : 0.4) * (0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.1) * 0.07)
  })
  return (
    <group>
      {/* nóżki */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.17, 0.06, sz * 0.17]}>
          <boxGeometry args={[0.04, 0.12, 0.04]} />
          <meshStandardMaterial color="#1d1d1f" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* korpus */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.64, 0.44]} />
        <meshStandardMaterial color="#232325" metalness={0.55} roughness={0.55} />
      </mesh>
      {/* szyba paleniska z żarem */}
      <mesh position={[0, 0.42, 0.225]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={night ? 3 : 1.4} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.45, 0.45]} color="#ff8d3a" distance={3.5} decay={2} />
    </group>
  )
}
