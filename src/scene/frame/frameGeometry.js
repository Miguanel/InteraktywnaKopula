import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Geometria pomocnicza dekoracji konstrukcji (liczona w metrach, w układzie kopuły:
 * podłoga y = 0, oś kopuły = oś Y).
 */

const _c = new THREE.Vector3()

/** Dane belki: końce, środek, kierunek, długość, wektor "do wnętrza" */
export function edgeFrame(dome, R, ei) {
  const [ia, ib] = dome.edges[ei]
  const a = new THREE.Vector3().fromArray(dome.vertices[ia]).multiplyScalar(R)
  const b = new THREE.Vector3().fromArray(dome.vertices[ib]).multiplyScalar(R)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const dir = b.clone().sub(a)
  const len = dir.length()
  dir.normalize()
  _c.set(0, dome.centerY * R, 0)
  // wektor do środka sfery, ortogonalny do belki
  const inward = _c.clone().sub(mid)
  inward.addScaledVector(dir, -inward.dot(dir)).normalize()
  return { a, b, mid, dir, len, inward }
}

/** Dane węzła: pozycja i wektor do wnętrza */
export function hubFrame(dome, R, vi) {
  const p = new THREE.Vector3().fromArray(dome.vertices[vi]).multiplyScalar(R)
  _c.set(0, dome.centerY * R, 0)
  const inward = _c.clone().sub(p).normalize()
  return { p, inward }
}

/** Macierz dla obiektu, którego lokalna oś X biegnie wzdłuż `dir`, a oś Z w stronę `normal` */
export function basisMatrix(pos, dir, normal, scale = [1, 1, 1], target = new THREE.Matrix4()) {
  const x = dir.clone().normalize()
  const z = normal.clone().addScaledVector(x, -normal.dot(x)).normalize()
  const y = new THREE.Vector3().crossVectors(z, x)
  target.makeBasis(x, y, z)
  target.scale(new THREE.Vector3(...scale))
  target.setPosition(pos)
  return target
}

/** Punkt celowania reflektora – podłoga, bliżej środka kopuły */
export function spotAim(dome, R, vi) {
  const h = hubFrame(dome, R, vi)
  const pos = h.p.clone().addScaledVector(h.inward, 0.09)
  const target = new THREE.Vector3(h.p.x * 0.35, 0, h.p.z * 0.35)
  if (h.p.y < 0.4) target.set(h.p.x * 0.5, 1.2, h.p.z * 0.5) // węzły przy ziemi świecą w górę
  const dir = target.clone().sub(pos).normalize()
  return { pos, target, dir, dist: pos.distanceTo(target) }
}

/** Punkty zwisającej girlandy między końcami belki (krzywa łańcuchowa ~ parabola) */
export function catenaryPoints(a, b, inward, n, sagRatio = 0.09) {
  const len = a.distanceTo(b)
  const sag = len * sagRatio
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = a.clone().lerp(b, t)
    p.addScaledVector(inward, 0.07)
    p.y -= sag * 4 * t * (1 - t)
    pts.push(p)
  }
  return pts
}

// ---------- Moduł pnącza (0,5 m wzdłuż osi Y, oplatający pręt) ----------
export const VINE_MODULE = 0.5

class Helix extends THREE.Curve {
  constructor(len, radius, turns, phase = 0) {
    super()
    this.len = len
    this.radius = radius
    this.turns = turns
    this.phase = phase
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns + this.phase
    return target.set(Math.cos(a) * this.radius, (t - 0.5) * this.len, Math.sin(a) * this.radius)
  }
}

let vineCache = null
export function vineGeometries() {
  if (vineCache) return vineCache
  const L = VINE_MODULE
  const stem = mergeGeometries([
    new THREE.TubeGeometry(new Helix(L, 0.036, 1.1), 28, 0.007, 5, false),
    new THREE.TubeGeometry(new Helix(L, 0.03, 0.8, Math.PI), 20, 0.005, 4, false),
  ])

  const leafParts = []
  const flowerParts = []
  const helix = new Helix(L, 0.036, 1.1)
  const leafShape = new THREE.Shape()
  leafShape.moveTo(0, 0)
  leafShape.quadraticCurveTo(0.05, 0.045, 0, 0.115)
  leafShape.quadraticCurveTo(-0.05, 0.045, 0, 0)
  const leafBase = new THREE.ShapeGeometry(leafShape, 5)
  const N = 16
  for (let k = 0; k < N; k++) {
    const t = (k + 0.5) / N
    const p = helix.getPoint(t)
    const radial = new THREE.Vector3(p.x, 0, p.z).normalize()
    const g = leafBase.clone()
    // liść odchylony od pręta, lekko pochylony w dół
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, -0.35 + (k % 3) * 0.3, 0)).normalize())
    const s = 0.85 + ((k * 37) % 10) / 25
    m.compose(p, q, new THREE.Vector3(s, s, s))
    g.applyMatrix4(m)
    leafParts.push(g)
    if (k % 3 === 1) {
      const f = new THREE.IcosahedronGeometry(0.028, 0)
      f.translate(p.x * 1.9, p.y, p.z * 1.9)
      flowerParts.push(f)
      const f2 = new THREE.IcosahedronGeometry(0.02, 0)
      f2.translate(p.x * 2.3, p.y - 0.03, p.z * 2.3)
      flowerParts.push(f2)
    }
  }
  const leaves = mergeGeometries(leafParts)
  leaves.computeVertexNormals()
  const flowers = mergeGeometries(flowerParts)
  vineCache = { stem, leaves, flowers }
  return vineCache
}
