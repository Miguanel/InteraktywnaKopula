import ModelSlot from './ModelSlot'
import { useDome } from '../domeContext'

const COUNT = 6

/** Słupki oświetleniowe wokół podstawy (omijają wejście na osi +Z). */
export default function OutdoorLights({ meta }) {
  const { R, dome, night } = useDome()
  const r = dome.baseRadius * R + 0.75
  return (
    <group>
      {Array.from({ length: COUNT }, (_, i) => {
        const a = ((i + 0.5) / COUNT) * Math.PI * 2
        return (
          <ModelSlot
            key={i}
            url={meta.model}
            position={[Math.sin(a) * r, 0, Math.cos(a) * r]}
            fallback={<BollardPlaceholder night={night} withLight={i % 2 === 0} />}
          />
        )
      })}
    </group>
  )
}

function BollardPlaceholder({ night, withLight }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.6, 12]} />
        <meshStandardMaterial color="#2b2b2e" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 12]} />
        <meshStandardMaterial
          color="#fff1c9"
          emissive="#ffc46b"
          emissiveIntensity={night ? 4 : 0.6}
          toneMapped={false}
        />
      </mesh>
      {withLight && (
        <pointLight position={[0, 0.75, 0]} color="#ffc47a" intensity={night ? 4 : 0} distance={4.5} decay={2} />
      )}
    </group>
  )
}
