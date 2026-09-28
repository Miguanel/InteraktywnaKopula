import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { catenaryPoints, edgeFrame, spotAim } from './frameGeometry'

/**
 * FRAME LIGHTS – prawdziwe światło z opraw na konstrukcji.
 * ---------------------------------------------------------------
 * Każda oprawa (belkowa, punktowa, girlanda) jest "emiterem" z pozycją, kolorem i mocą.
 * Ponieważ każde światło w WebGL kosztuje (szczególnie na telefonach), emitery są
 * grupowane (k-means z karą za różnicę koloru) do stałej puli świateł:
 *   • PointLight – belkowe LED i lampki na sznurku,
 *   • SpotLight  – reflektory na węzłach (celują w podłogę, rzucają kolorowe plamy).
 * Pula ma stały rozmiar (nieużywane światła mają moc 0), więc klikanie kolejnych opraw
 * nie wywołuje ponownej kompilacji shaderów.
 */

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const POINT_POOL = isTouch ? 4 : 7
const SPOT_POOL = isTouch ? 3 : 5

const _a = new THREE.Color()
const _b = new THREE.Color()

/** k-means po pozycji z karą za różny kolor → max k grup */
function cluster(emitters, k) {
  if (!emitters.length) return []
  const colorDist = (x, y) => {
    _a.set(x)
    _b.set(y)
    return Math.hypot(_a.r - _b.r, _a.g - _b.g, _a.b - _b.b)
  }
  const dist = (e, c) => e.pos.distanceTo(c.pos) + colorDist(e.hex, c.hex) * 4
  // inicjalizacja: najdalsze punkty
  const centers = [{ pos: emitters[0].pos.clone(), hex: emitters[0].hex }]
  while (centers.length < Math.min(k, emitters.length)) {
    let best = null
    let bestD = -1
    for (const e of emitters) {
      const d = Math.min(...centers.map((c) => dist(e, c)))
      if (d > bestD) {
        bestD = d
        best = e
      }
    }
    centers.push({ pos: best.pos.clone(), hex: best.hex })
  }
  let groups = []
  for (let iter = 0; iter < 6; iter++) {
    groups = centers.map(() => [])
    for (const e of emitters) {
      let bi = 0
      let bd = Infinity
      centers.forEach((c, i) => {
        const d = dist(e, c)
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      groups[bi].push(e)
    }
    groups.forEach((g, i) => {
      if (!g.length) return
      const w = g.reduce((s, e) => s + e.weight, 0)
      const p = new THREE.Vector3()
      g.forEach((e) => p.addScaledVector(e.pos, e.weight / w))
      centers[i].pos = p
      // kolor = średnia ważona (w przestrzeni liniowej)
      const c = new THREE.Color(0, 0, 0)
      g.forEach((e) => {
        _a.set(e.hex)
        c.r += (_a.r * e.weight) / w
        c.g += (_a.g * e.weight) / w
        c.b += (_a.b * e.weight) / w
      })
      centers[i].hex = `#${c.getHexString()}`
    })
  }
  return groups
    .map((g, i) => {
      if (!g.length) return null
      const weight = g.reduce((s, e) => s + e.weight, 0)
      const spread = Math.max(...g.map((e) => e.pos.distanceTo(centers[i].pos)))
      const target = g[0].target ? new THREE.Vector3() : null
      if (target) g.forEach((e) => target.addScaledVector(e.target, 1 / g.length))
      return { pos: centers[i].pos, color: centers[i].hex, weight, count: g.length, spread, target }
    })
    .filter(Boolean)
}

export default function FrameLights({ lists, dome, R, night }) {
  const { points, spots } = useMemo(() => {
    const pe = []
    for (const { index, info } of lists.beam) {
      const e = edgeFrame(dome, R, index)
      pe.push({ pos: e.mid.clone().addScaledVector(e.inward, 0.15), hex: info.variant.hex, weight: e.len * 1.0 })
    }
    for (const { index, info } of lists.string) {
      const e = edgeFrame(dome, R, index)
      const mid = catenaryPoints(e.a, e.b, e.inward, 2)[1]
      pe.push({ pos: mid.addScaledVector(e.inward, 0.08), hex: info.variant.hex, weight: e.len * 0.55 })
    }
    const se = lists.spot.map(({ index, info }) => {
      const s = spotAim(dome, R, index)
      return { pos: s.pos, target: s.target, hex: info.variant.hex, weight: 1 }
    })
    return { points: cluster(pe, POINT_POOL), spots: cluster(se, SPOT_POOL) }
  }, [lists, dome, R])

  // pulę montujemy dopiero przy pierwszej oprawie – potem zostaje (stała liczba świateł)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (points.length || spots.length) setMounted(true)
  }, [points.length, spots.length])
  if (!mounted) return null

  const boost = night ? 1 : 0.6
  return (
    <group>
      {Array.from({ length: POINT_POOL }, (_, i) => {
        const c = points[i]
        return (
          <pointLight
            key={`p${i}`}
            position={c ? c.pos : [0, -50, 0]}
            color={c ? c.color : '#000'}
            intensity={c ? Math.min(40, 2.6 * c.weight) * boost : 0}
            distance={c ? 3.2 + c.spread * 1.3 : 0.1}
            decay={2}
          />
        )
      })}
      {Array.from({ length: SPOT_POOL }, (_, i) => (
        <PoolSpot key={`s${i}`} c={spots[i]} boost={boost} R={R} />
      ))}
    </group>
  )
}

function PoolSpot({ c, boost, R }) {
  const target = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (c?.target) target.position.copy(c.target)
    target.updateMatrixWorld()
  }, [c, target])
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={c ? c.pos : [0, -50, 0]}
        target={target}
        color={c ? c.color : '#000'}
        intensity={c ? Math.min(60, 7 * Math.pow(c.count, 0.75)) * boost : 0}
        angle={c ? Math.min(1.1, 0.5 + c.spread / (R * 1.5)) : 0.5}
        penumbra={0.65}
        distance={c ? R * 3 : 0.1}
        decay={1.6}
      />
    </>
  )
}
