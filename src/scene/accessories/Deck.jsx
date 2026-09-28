import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import ModelSlot from './ModelSlot'
import { useDome } from '../domeContext'

export const DECK_HEIGHT = 0.3 // m
export const DECK_MARGIN = 1.3 // m – szerokość tarasu wokół kopuły

const PLANK_W = 0.14
const PLANK_GAP = 0.012

/** Podest/taras. Rysowany poniżej "podłogi" kopuły (y ∈ [-DECK_HEIGHT, 0]). */
export default function Deck({ meta }) {
  const { R, dome } = useDome()
  const radius = dome.baseRadius * R + DECK_MARGIN
  return (
    <ModelSlot
      url={meta.model}
      // 🔌 Model .glb podestu przygotuj dla promienia 1 m – skalujemy go do rozmiaru kopuły:
      scale={meta.model ? [radius, 1, radius] : 1}
      fallback={<DeckPlaceholder radius={radius} />}
    />
  )
}

function DeckPlaceholder({ radius }) {
  const planks = useRef()
  const rows = useMemo(() => {
    const out = []
    for (let z = -radius + PLANK_W / 2; z < radius; z += PLANK_W + PLANK_GAP) {
      const half = Math.sqrt(Math.max(0, radius * radius - z * z)) - 0.04
      if (half > 0.05) out.push({ z, len: half * 2 })
    }
    return out
  }, [radius])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const tint = new THREE.Color()
    rows.forEach(({ z, len }, i) => {
      m.compose(new THREE.Vector3(0, -0.02, z), new THREE.Quaternion(), new THREE.Vector3(len, 1, 1))
      planks.current.setMatrixAt(i, m)
      // delikatne zróżnicowanie odcienia desek
      const h = Math.sin(i * 12.9898) * 43758.5453
      tint.setHSL(0.075, 0.42, 0.36 + (h - Math.floor(h)) * 0.08)
      planks.current.setColorAt(i, tint)
    })
    planks.current.instanceMatrix.needsUpdate = true
    if (planks.current.instanceColor) planks.current.instanceColor.needsUpdate = true
    planks.current.computeBoundingSphere()
  }, [rows])

  const steps = 2
  const stepH = DECK_HEIGHT / (steps + 1)
  return (
    <group>
      {/* konstrukcja nośna */}
      <mesh position={[0, -DECK_HEIGHT / 2 - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius - 0.02, radius - 0.05, DECK_HEIGHT - 0.04, 48]} />
        <meshStandardMaterial color="#5a3b24" roughness={0.9} />
      </mesh>
      {/* deski */}
      <instancedMesh key={rows.length} ref={planks} args={[undefined, undefined, rows.length]} receiveShadow castShadow>
        <boxGeometry args={[1, 0.04, PLANK_W]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {/* schodki przy wejściu (+Z) */}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, -DECK_HEIGHT + stepH * (i + 0.5), radius + 0.18 + (steps - 1 - i) * 0.3]} castShadow receiveShadow>
          <boxGeometry args={[1.4, stepH, 0.32 + (steps - 1 - i) * 0.3]} />
          <meshStandardMaterial color="#8b5e3c" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
