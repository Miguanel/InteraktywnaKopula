import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FRAMES } from '../../config/catalog'
import { resolveAttach, LIGHT_COLORS } from '../../config/frameDecor'
import { ringOfEdges, ringOfHubs } from '../../lib/domeMath'
import { useConfigurator } from '../../store/useConfigurator'
import { useDome } from '../domeContext'
import { basisMatrix, catenaryPoints, edgeFrame, hubFrame, spotAim, vineGeometries, VINE_MODULE } from './frameGeometry'
import FrameLights from './FrameLights'

/**
 * FRAME DECOR – dekoracje montowane na belkach i węzłach konstrukcji:
 *   belkowe LED · reflektory punktowe · lampki na sznurku · pnącza · wiszące donice
 *
 * Oprawy i rośliny są instancjonowane (kilka draw calli niezależnie od liczby dekoracji),
 * a prawdziwe oświetlenie sceny zapewnia FrameLights (pula świateł w wybranych kolorach).
 */
export default function FrameDecor({ config }) {
  const ctx = useDome()
  const { R, dome, night } = ctx
  const frame = FRAMES.find((f) => f.id === config.frame) ?? FRAMES[0]
  const { edgeLight, edgePlant, hubLight, hubPlant } = config.attach

  // rozbicie na listy wg typu
  const lists = useMemo(() => {
    const out = { beam: [], string: [], spot: [], vine: [], pot: [] }
    const push = (map) => {
      for (const [k, code] of Object.entries(map)) {
        const info = resolveAttach(code)
        if (info) out[info.decor.id].push({ index: Number(k), info })
      }
    }
    push(edgeLight)
    push(edgePlant)
    push(hubLight)
    push(hubPlant)
    return out
  }, [edgeLight, edgePlant, hubLight, hubPlant])

  return (
    <group>
      {lists.beam.length > 0 && <Beams list={lists.beam} dome={dome} R={R} frame={frame} />}
      {lists.spot.length > 0 && <Spots list={lists.spot} dome={dome} R={R} night={night} />}
      {lists.string.length > 0 && <StringLights list={lists.string} dome={dome} R={R} />}
      {lists.vine.length > 0 && <Vines list={lists.vine} dome={dome} R={R} />}
      {lists.pot.map((p) => (
        <HangingPot key={p.index} item={p} dome={dome} R={R} />
      ))}
      <FrameLights lists={lists} dome={dome} R={R} night={night} />
      <FramePicker dome={dome} R={R} />
    </group>
  )
}

const _m = new THREE.Matrix4()
const _col = new THREE.Color()
const hexOf = (info) => info.variant.hex

// ---------- Belkowe LED ----------
function Beams({ list, dome, R, frame }) {
  const body = useRef()
  const strip = useRef()
  useLayoutEffect(() => {
    list.forEach(({ index, info }, i) => {
      const e = edgeFrame(dome, R, index)
      const len = Math.max(0.1, e.len - frame.hubRadius * 2.6)
      const off = frame.strutRadius + 0.018
      basisMatrix(e.mid.clone().addScaledVector(e.inward, off), e.dir, e.inward, [len, 0.022, 0.03], _m)
      body.current.setMatrixAt(i, _m)
      basisMatrix(e.mid.clone().addScaledVector(e.inward, off + 0.016), e.dir, e.inward, [len * 0.97, 0.012, 0.004], _m)
      strip.current.setMatrixAt(i, _m)
      strip.current.setColorAt(i, _col.set(hexOf(info)))
    })
    for (const m of [body.current, strip.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [list, dome, R, frame])
  return (
    <group>
      <instancedMesh key={`b${list.length}`} ref={body} args={[undefined, undefined, list.length]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color="#b8bcc2" metalness={0.8} roughness={0.35} />
      </instancedMesh>
      <instancedMesh key={`s${list.length}`} ref={strip} args={[undefined, undefined, list.length]}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ---------- Reflektory punktowe na węzłach ----------
function Spots({ list, dome, R, night }) {
  const housing = useRef()
  const lens = useRef()
  const cone = useRef()
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useLayoutEffect(() => {
    const q = new THREE.Quaternion()
    list.forEach(({ index, info }, i) => {
      const s = spotAim(dome, R, index)
      q.setFromUnitVectors(up, s.dir)
      _m.compose(s.pos, q, new THREE.Vector3(1, 1, 1))
      housing.current.setMatrixAt(i, _m)
      _m.compose(s.pos.clone().addScaledVector(s.dir, 0.056), q, new THREE.Vector3(1, 1, 1))
      lens.current.setMatrixAt(i, _m)
      lens.current.setColorAt(i, _col.set(hexOf(info)))
      // stożek światła (widoczny w nocy)
      const L = Math.min(s.dist, 2.6)
      const qc = new THREE.Quaternion().setFromUnitVectors(up, s.dir.clone().negate())
      _m.compose(s.pos.clone().addScaledVector(s.dir, L / 2 + 0.06), qc, new THREE.Vector3(L * 0.5, L, L * 0.5))
      cone.current.setMatrixAt(i, _m)
      cone.current.setColorAt(i, _col.set(hexOf(info)))
    })
    for (const m of [housing.current, lens.current, cone.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [list, dome, R, up])
  return (
    <group>
      <instancedMesh key={`h${list.length}`} ref={housing} args={[undefined, undefined, list.length]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.11, 14]} />
        <meshStandardMaterial color="#2a2a2e" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh key={`l${list.length}`} ref={lens} args={[undefined, undefined, list.length]}>
        <cylinderGeometry args={[0.03, 0.03, 0.006, 14]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`c${list.length}`} ref={cone} args={[undefined, undefined, list.length]} visible={night}>
        {/* stożek o wysokości 1 i promieniu podstawy ~0,45 (skalowany na instancję) */}
        <coneGeometry args={[0.9, 1, 20, 1, true]} />
        <meshBasicMaterial transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ---------- Lampki na sznurku ----------
function StringLights({ list, dome, R }) {
  const bulbs = useRef()
  const { points, bulbCount, wire } = useMemo(() => {
    const pts = []
    const wirePos = []
    for (const { index, info } of list) {
      const e = edgeFrame(dome, R, index)
      const n = Math.max(3, Math.round(e.len / 0.22))
      const curve = catenaryPoints(e.a, e.b, e.inward, 16)
      for (let i = 0; i < curve.length - 1; i++) wirePos.push(...curve[i].toArray(), ...curve[i + 1].toArray())
      const bulbPts = catenaryPoints(e.a, e.b, e.inward, n)
      for (let i = 1; i < bulbPts.length - 1; i++) pts.push({ p: bulbPts[i].setY(bulbPts[i].y - 0.03), hex: hexOf(info) })
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(wirePos, 3))
    return { points: pts, bulbCount: pts.length, wire: g }
  }, [list, dome, R])
  useLayoutEffect(() => () => wire.dispose(), [wire])
  useLayoutEffect(() => {
    points.forEach(({ p, hex }, i) => {
      bulbs.current.setMatrixAt(i, _m.makeTranslation(p.x, p.y, p.z))
      bulbs.current.setColorAt(i, _col.set(hex))
    })
    bulbs.current.instanceMatrix.needsUpdate = true
    if (bulbs.current.instanceColor) bulbs.current.instanceColor.needsUpdate = true
    bulbs.current.computeBoundingSphere()
  }, [points])
  return (
    <group>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color="#1b1b1b" />
      </lineSegments>
      <instancedMesh key={bulbCount} ref={bulbs} args={[undefined, undefined, bulbCount]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ---------- Pnącza ----------
function Vines({ list, dome, R }) {
  const { stem, leaves, flowers } = vineGeometries()
  const stemRef = useRef()
  const leafRef = useRef()
  const flowerRef = useRef()
  const modules = useMemo(() => {
    const out = []
    const up = new THREE.Vector3(0, 1, 0)
    for (const { index, info } of list) {
      const e = edgeFrame(dome, R, index)
      const n = Math.max(1, Math.round(e.len / VINE_MODULE))
      const segLen = e.len / n
      const q = new THREE.Quaternion().setFromUnitVectors(up, e.dir)
      for (let k = 0; k < n; k++) {
        const roll = new THREE.Quaternion().setFromAxisAngle(up, (index * 1.7 + k * 2.1) % (Math.PI * 2))
        const pos = e.a.clone().addScaledVector(e.dir, (k + 0.5) * segLen)
        out.push({ pos, q: q.clone().multiply(roll), sy: segLen / VINE_MODULE, variant: info.variant, seed: index * 7 + k })
      }
    }
    return out
  }, [list, dome, R])
  const flowerModules = modules.filter((m) => m.variant.flower)

  useLayoutEffect(() => {
    const leafCol = new THREE.Color()
    modules.forEach((m, i) => {
      _m.compose(m.pos, m.q, new THREE.Vector3(1, m.sy, 1))
      stemRef.current.setMatrixAt(i, _m)
      leafRef.current.setMatrixAt(i, _m)
      leafCol.set(m.variant.leaf).lerp(_col.set(m.variant.leaf2), (m.seed % 5) / 5)
      leafRef.current.setColorAt(i, leafCol)
    })
    flowerModules.forEach((m, i) => {
      _m.compose(m.pos, m.q, new THREE.Vector3(1, m.sy, 1))
      flowerRef.current?.setMatrixAt(i, _m)
      flowerRef.current?.setColorAt(i, _col.set(m.variant.flower))
    })
    for (const r of [stemRef.current, leafRef.current, flowerRef.current]) {
      if (!r) continue
      r.instanceMatrix.needsUpdate = true
      if (r.instanceColor) r.instanceColor.needsUpdate = true
      r.computeBoundingSphere()
    }
  }, [modules, flowerModules])

  return (
    <group>
      <instancedMesh key={`st${modules.length}`} ref={stemRef} args={[stem, undefined, modules.length]} castShadow>
        <meshStandardMaterial color="#5a4a2a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh key={`lf${modules.length}`} ref={leafRef} args={[leaves, undefined, modules.length]} castShadow>
        <meshStandardMaterial roughness={0.8} side={THREE.DoubleSide} />
      </instancedMesh>
      {flowerModules.length > 0 && (
        <instancedMesh key={`fl${flowerModules.length}`} ref={flowerRef} args={[flowers, undefined, flowerModules.length]}>
          <meshStandardMaterial roughness={0.6} />
        </instancedMesh>
      )}
    </group>
  )
}

// ---------- Wisząca donica ----------
function HangingPot({ item, dome, R }) {
  const h = hubFrame(dome, R, item.index)
  const rope = Math.max(0, Math.min(0.4, h.p.y - 0.9))
  const pos = h.p.clone().addScaledVector(h.inward, 0.06)
  const v = item.info.variant
  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {rope > 0 && (
        <mesh position={[0, -rope / 2, 0]}>
          <cylinderGeometry args={[0.004, 0.004, rope, 4]} />
          <meshStandardMaterial color="#c9b48a" />
        </mesh>
      )}
      <group position={[0, -rope - 0.08, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.08, 0.14, 16]} />
          <meshStandardMaterial color="#e9e2d6" roughness={0.8} />
        </mesh>
        {v.id === 'trailing'
          ? Array.from({ length: 7 }, (_, k) => {
              const a = (k / 7) * Math.PI * 2
              const l = 0.3 + ((k * 13) % 5) * 0.07
              return (
                <mesh key={k} position={[Math.cos(a) * 0.09, 0.02 - l / 2, Math.sin(a) * 0.09]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[0.035, l, 5]} />
                  <meshStandardMaterial color={v.leaf} roughness={0.85} flatShading />
                </mesh>
              )
            })
          : Array.from({ length: 6 }, (_, k) => {
              const a = (k / 6) * Math.PI * 2
              return (
                <mesh key={k} position={[Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]} castShadow>
                  <coneGeometry args={[0.04, 0.32, 4]} />
                  <meshStandardMaterial color={v.leaf} roughness={0.85} flatShading />
                </mesh>
              )
            })}
      </group>
    </group>
  )
}

// ---------- Wybór belek / węzłów w trybie edycji ----------
function FramePicker({ dome, R }) {
  const editMode = useConfigurator((s) => s.view.editMode)
  const brush = useConfigurator((s) => s.view.frameBrush)
  const hover = useConfigurator((s) => s.view.hoverFrame)
  const { applyFrame, setHoverFrame } = useConfigurator.getState()
  const edgeRef = useRef()
  const hubRef = useRef()
  const active = editMode === 'frame'
  const target = brush.code === 'erase' ? 'both' : resolveAttach(brush.code)?.decor.target

  useLayoutEffect(() => {
    if (!active) return
    const up = new THREE.Vector3(0, 1, 0)
    const q = new THREE.Quaternion()
    if (edgeRef.current) {
      dome.edges.forEach((_, i) => {
        const e = edgeFrame(dome, R, i)
        q.setFromUnitVectors(up, e.dir)
        _m.compose(e.mid, q, new THREE.Vector3(1, e.len * 0.8, 1))
        edgeRef.current.setMatrixAt(i, _m)
      })
      edgeRef.current.instanceMatrix.needsUpdate = true
      edgeRef.current.computeBoundingSphere()
    }
    if (hubRef.current) {
      dome.vertices.forEach((v, i) => hubRef.current.setMatrixAt(i, _m.makeTranslation(v[0] * R, v[1] * R, v[2] * R)))
      hubRef.current.instanceMatrix.needsUpdate = true
      hubRef.current.computeBoundingSphere()
    }
  }, [active, dome, R, target])

  const handlers = (kind) => ({
    onPointerMove: (e) => {
      e.stopPropagation()
      setHoverFrame({ kind, index: e.instanceId })
    },
    onPointerOut: () => setHoverFrame(null),
    onClick: (e) => {
      e.stopPropagation()
      if (e.delta > 6) return
      applyFrame(kind, e.instanceId)
    },
  })

  if (!active) return null
  const pickMat = <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
  return (
    <group>
      {(target === 'edge' || target === 'both') && (
        <instancedMesh key={`pe${dome.edges.length}`} ref={edgeRef} args={[undefined, undefined, dome.edges.length]} {...handlers('edge')}>
          <cylinderGeometry args={[0.1, 0.1, 1, 6]} />
          {pickMat}
        </instancedMesh>
      )}
      {(target === 'hub' || target === 'both') && (
        <instancedMesh key={`ph${dome.vertices.length}`} ref={hubRef} args={[undefined, undefined, dome.vertices.length]} {...handlers('hub')}>
          <sphereGeometry args={[0.2, 10, 8]} />
          {pickMat}
        </instancedMesh>
      )}
      {hover && <FrameHighlight dome={dome} R={R} hover={hover} tool={brush.tool} />}
    </group>
  )
}

function FrameHighlight({ dome, R, hover, tool }) {
  const ref = useRef()
  const ids = useMemo(() => {
    if (hover.index == null) return []
    if (tool !== 'ring') return [hover.index]
    return hover.kind === 'edge' ? ringOfEdges(dome, hover.index) : ringOfHubs(dome, hover.index)
  }, [dome, hover, tool])
  useLayoutEffect(() => {
    if (!ref.current) return
    const up = new THREE.Vector3(0, 1, 0)
    const q = new THREE.Quaternion()
    ids.forEach((id, i) => {
      if (hover.kind === 'edge') {
        const e = edgeFrame(dome, R, id)
        q.setFromUnitVectors(up, e.dir)
        _m.compose(e.mid, q, new THREE.Vector3(1, e.len, 1))
      } else {
        const v = dome.vertices[id]
        _m.makeTranslation(v[0] * R, v[1] * R, v[2] * R)
      }
      ref.current.setMatrixAt(i, _m)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [ids, dome, R, hover.kind])
  if (!ids.length) return null
  return (
    <instancedMesh key={`${hover.kind}${ids.length}`} ref={ref} args={[undefined, undefined, ids.length]} renderOrder={20}>
      {hover.kind === 'edge' ? <cylinderGeometry args={[0.045, 0.045, 1, 8]} /> : <sphereGeometry args={[0.11, 12, 10]} />}
      <meshBasicMaterial color="#f2c96b" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

export { LIGHT_COLORS }
