import { useDome } from '../domeContext'

/**
 * Sylwetka człowieka (175 cm) – pomaga klientowi ocenić skalę kopuły.
 * Styl "makietowy", neutralny – nie konkuruje z produktem.
 */
export default function ScaleFigure() {
  const { R, dome } = useDome()
  const a = (-62 * Math.PI) / 180
  const r = dome.baseRadius * R + 1.0
  const mat = <meshStandardMaterial color="#c9ccd1" roughness={0.85} />
  return (
    <group position={[Math.sin(a) * r, 0, Math.cos(a) * r]} rotation={[0, a + Math.PI * 0.85, 0]}>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.44, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.74, 4, 10]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, 1.18, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 4, 12]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.24, 1.12, 0]} rotation={[0, 0, s * 0.08]} castShadow>
          <capsuleGeometry args={[0.05, 0.56, 4, 8]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, 1.63, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
        {mat}
      </mesh>
    </group>
  )
}
