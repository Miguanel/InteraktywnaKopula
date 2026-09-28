import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PlantPlaceholder } from '../accessories/Plants'

/**
 * PLACEHOLDERY ELEMENTÓW ARANŻACJI (proste bryły, wymiary w metrach)
 * ---------------------------------------------------------------
 * Konwencja: środek podstawy w (0,0,0), przód elementu w stronę +Z.
 * Elementy podwieszane: (0,0,0) = punkt zawieszenia, bryła poniżej.
 * Po dodaniu pliku .glb w src/config/items.js placeholder zostanie zastąpiony
 * automatycznie (ModelSlot) – światła (pointLight) zostają, bo są poza placeholderem.
 */

const WOOD = '#8b5e3c'
const METAL = '#2a2a2d'
const FABRIC = '#f2eee6'
const WINE = '#6a1a2c'

export function LedBarPlaceholder({ night }) {
  return (
    <group>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.05, 0.07]} />
        <meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.027, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.16, 0.05]} />
        <meshStandardMaterial color="#fff7e0" emissive="#ffd9a0" emissiveIntensity={night ? 6 : 1.5} toneMapped={false} side={2} />
      </mesh>
    </group>
  )
}

export function LedStripPlaceholder({ night }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.08, 0.1]} />
        <meshStandardMaterial color="#b9bcc0" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.46, 0.05]} />
        <meshStandardMaterial color="#fff7e0" emissive="#ffc57a" emissiveIntensity={night ? 5 : 1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function FloorLampPlaceholder({ night }) {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.03, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.73, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.42, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.3, 24, 1, true]} />
        <meshStandardMaterial
          color={FABRIC}
          emissive="#ffcf8a"
          emissiveIntensity={night ? 2.2 : 0.25}
          side={2}
          roughness={0.9}
        />
      </mesh>
    </group>
  )
}

export function UvLampPlaceholder({ night }) {
  return (
    <group>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.sin(a) * 0.14, 0.45, Math.cos(a) * 0.14]} rotation={[Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32]}>
            <cylinderGeometry args={[0.012, 0.012, 0.95, 6]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
        )
      })}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.25, 6]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <group position={[0, 1.18, 0]} rotation={[-0.35, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.2, 0.14]} />
          <meshStandardMaterial color="#1c1c20" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.071]}>
          <planeGeometry args={[0.26, 0.16]} />
          <meshStandardMaterial color="#b58cff" emissive="#7b3cff" emissiveIntensity={night ? 5 : 1.2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export function SpeakerPlaceholder() {
  return (
    <group>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 3
        return (
          <mesh key={k} position={[Math.sin(a) * 0.18, 0.32, Math.cos(a) * 0.18]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
            <cylinderGeometry args={[0.012, 0.012, 0.72, 6]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.75, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.5} />
      </mesh>
      <group position={[0, 1.55, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.52, 0.3]} />
          <meshStandardMaterial color="#141416" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.08, 0.151]}>
          <circleGeometry args={[0.12, 24]} />
          <meshStandardMaterial color="#2b2b30" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.16, 0.151]}>
          <circleGeometry args={[0.045, 20]} />
          <meshStandardMaterial color="#3a3a40" roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

export function SubwooferPlaceholder() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.6, 0.62]} />
        <meshStandardMaterial color="#141416" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.3, 0.311]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#2b2b30" roughness={0.4} />
      </mesh>
    </group>
  )
}

export function BedPlaceholder() {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.72, 0.3, 2.12]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.41, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.22, 2.0]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      {/* narzuta w kolorze marki */}
      <mesh position={[0, 0.53, 0.42]} castShadow>
        <boxGeometry args={[1.64, 0.04, 1.1]} />
        <meshStandardMaterial color={WINE} roughness={0.95} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.58, -0.72]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.38]} />
          <meshStandardMaterial color="#fbf8f2" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, -1.04]} castShadow>
        <boxGeometry args={[1.72, 0.9, 0.08]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
    </group>
  )
}

export function BeanbagPlaceholder() {
  return (
    <mesh position={[0, 0.27, 0]} scale={[1, 0.58, 1]} castShadow receiveShadow>
      <sphereGeometry args={[0.47, 24, 16]} />
      <meshStandardMaterial color="#efece6" roughness={1} />
    </mesh>
  )
}

export function TablePlaceholder() {
  return (
    <group>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.04, 32]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.44, 12]} />
        <meshStandardMaterial color={METAL} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.03, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} />
      </mesh>
    </group>
  )
}

export function RugPlaceholder() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, 0.006]} receiveShadow>
        <circleGeometry args={[1.0, 48]} />
        <meshStandardMaterial color="#c9a57a" roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.008]} receiveShadow>
        <ringGeometry args={[0.72, 0.84, 48]} />
        <meshStandardMaterial color={WINE} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.008]} receiveShadow>
        <ringGeometry args={[0.28, 0.34, 32]} />
        <meshStandardMaterial color={WINE} roughness={1} />
      </mesh>
    </group>
  )
}

export function StovePlaceholder({ night }) {
  const light = useRef()
  useFrame(({ clock }) => {
    if (!light.current) return
    const t = clock.elapsedTime
    light.current.intensity = (night ? 2.2 : 0.4) * (0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.1) * 0.07)
  })
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.17, 0.06, sz * 0.17]}>
          <boxGeometry args={[0.04, 0.12, 0.04]} />
          <meshStandardMaterial color="#1d1d1f" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.64, 0.44]} />
        <meshStandardMaterial color="#232325" metalness={0.55} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.42, 0.225]}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff6a1a" emissiveIntensity={night ? 3 : 1.4} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.45, 0.45]} color="#ff8d3a" distance={3.5} decay={2} />
    </group>
  )
}

export function PlantPotPlaceholder({ variant = 0 }) {
  return <PlantPlaceholder variant={variant} />
}
