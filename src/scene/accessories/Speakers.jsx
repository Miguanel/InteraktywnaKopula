import ModelSlot from './ModelSlot'
import { useDome, surfaceRadiusAt, surfaceHeightAt } from '../domeContext'

/**
 * Głośniki podwieszone do konstrukcji – 2 szt. (4 szt. dla kopuł > 8 m).
 * Pivot modelu .glb = punkt zawieszenia (górna krawędź obudowy).
 */
export default function Speakers({ meta }) {
  const ctx = useDome()
  const { R, dome } = ctx
  const hangY = dome.height * R * 0.62
  const r = surfaceRadiusAt(ctx, hangY) - 0.45
  const azimuths = R > 4 ? [135, -135, 60, -60] : [135, -135]

  return (
    <group>
      {azimuths.map((deg) => {
        const a = (deg * Math.PI) / 180
        const x = Math.sin(a) * r
        const z = Math.cos(a) * r
        const cable = surfaceHeightAt(ctx, r) - hangY - 0.05
        return (
          <group key={deg} position={[x, hangY, z]} rotation={[0, a + Math.PI, 0]}>
            {/* linka mocująca do węzła konstrukcji */}
            <mesh position={[0, cable / 2, 0]}>
              <cylinderGeometry args={[0.006, 0.006, cable, 4]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <ModelSlot url={meta.model} rotation={[0.25, 0, 0]} fallback={<SpeakerPlaceholder />} />
          </group>
        )
      })}
    </group>
  )
}

function SpeakerPlaceholder() {
  return (
    <group position={[0, -0.22, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.44, 0.26]} />
        <meshStandardMaterial color="#121214" roughness={0.6} />
      </mesh>
      {/* membrany (skierowane do środka kopuły, +Z lokalnie po obrocie) */}
      <mesh position={[0, -0.06, 0.131]}>
        <circleGeometry args={[0.09, 24]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.13, 0.131]}>
        <circleGeometry args={[0.04, 20]} />
        <meshStandardMaterial color="#3a3a3e" roughness={0.3} />
      </mesh>
    </group>
  )
}
