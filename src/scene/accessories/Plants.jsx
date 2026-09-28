import ModelSlot from './ModelSlot'
import { useDome } from '../domeContext'

// [azymut w stopniach, wariant rośliny, skala]
const SPOTS = [
  [-24, 0, 1],
  [24, 1, 0.9],
  [130, 2, 1.1],
  [200, 0, 0.85],
  [250, 1, 1],
]

/** Donice z roślinami przy wejściu i dookoła kopuły. */
export default function Plants({ meta }) {
  const { R, dome } = useDome()
  const r = dome.baseRadius * R + 0.5
  return (
    <group>
      {SPOTS.map(([deg, variant, s], i) => {
        const a = (deg * Math.PI) / 180
        return (
          <ModelSlot
            key={i}
            url={meta.model}
            position={[Math.sin(a) * r, 0, Math.cos(a) * r]}
            scale={s}
            fallback={<PlantPlaceholder variant={variant} />}
          />
        )
      })}
    </group>
  )
}

function PlantPlaceholder({ variant }) {
  return (
    <group>
      {/* donica */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.16, 0.4, 16]} />
        <meshStandardMaterial color="#9c5a3c" roughness={0.9} />
      </mesh>
      {variant === 0 && (
        // krzew kulisty
        <group position={[0, 0.62, 0]}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.3, 1]} />
            <meshStandardMaterial color="#3f7a3a" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0.14, 0.12, 0.05]} castShadow>
            <icosahedronGeometry args={[0.2, 1]} />
            <meshStandardMaterial color="#4f8f45" roughness={0.9} flatShading />
          </mesh>
        </group>
      )}
      {variant === 1 && (
        // iglak / tuja
        <mesh position={[0, 0.95, 0]} castShadow>
          <coneGeometry args={[0.26, 1.1, 10]} />
          <meshStandardMaterial color="#2f6135" roughness={0.9} flatShading />
        </mesh>
      )}
      {variant === 2 && (
        // trawa ozdobna
        <group position={[0, 0.4, 0]}>
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.sin(a) * 0.06, 0.32, Math.cos(a) * 0.06]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]} castShadow>
                <coneGeometry args={[0.035, 0.7, 5]} />
                <meshStandardMaterial color="#8aa556" roughness={0.9} />
              </mesh>
            )
          })}
        </group>
      )}
    </group>
  )
}
