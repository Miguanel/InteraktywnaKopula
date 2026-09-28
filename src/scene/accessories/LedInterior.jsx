import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import ModelSlot from './ModelSlot'
import { useDome } from '../domeContext'

const STRANDS = 8
const INSET = 0.92 // girlanda biegnie tuż pod poszyciem

/**
 * Girlandy LED – pasma od szczytu kopuły w dół, generowane proceduralnie.
 * Żarówki są instancjonowane (1 draw call). Model .glb (meta.model) –
 * jeśli podany – zastępuje jedynie "żarówkę" przy szczycie (np. lampa wisząca).
 */
export default function LedInterior({ meta }) {
  const { R, dome, night } = useDome()
  const bulbs = useRef()
  const cy = dome.centerY * R
  const height = dome.height * R

  const points = useMemo(() => {
    const pts = []
    const perStrand = Math.max(6, Math.round(R * 2.4))
    const thetaMax = Math.acos(Math.min(1, (height * 0.38 - cy) / (R * INSET)))
    for (let s = 0; s < STRANDS; s++) {
      const az = (s / STRANDS) * Math.PI * 2 + Math.PI / STRANDS
      for (let k = 1; k <= perStrand; k++) {
        const t = (k / perStrand) * thetaMax
        const r = R * INSET
        pts.push([Math.sin(t) * Math.sin(az) * r, cy + Math.cos(t) * r - 0.05, Math.sin(t) * Math.cos(az) * r])
      }
    }
    return pts
  }, [R, cy, height])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    points.forEach((p, i) => bulbs.current.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])))
    bulbs.current.instanceMatrix.needsUpdate = true
    bulbs.current.computeBoundingSphere()
  }, [points])

  return (
    <group>
      <instancedMesh key={points.length} ref={bulbs} args={[undefined, undefined, points.length]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#fff3d1" emissive="#ffc46b" emissiveIntensity={night ? 5 : 1.2} toneMapped={false} />
      </instancedMesh>
      <ModelSlot
        url={meta.model}
        position={[0, height - 0.12, 0]}
        fallback={
          <mesh>
            <sphereGeometry args={[0.07, 12, 8]} />
            <meshStandardMaterial color="#fff3d1" emissive="#ffc46b" emissiveIntensity={night ? 5 : 1} toneMapped={false} />
          </mesh>
        }
      />
      <pointLight position={[0, height * 0.55, 0]} color="#ffbe73" intensity={night ? R * 9 : R * 1.5} distance={R * 3} decay={2} />
    </group>
  )
}
