import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { COVERS, FRAMES } from '../config/catalog'
import { useDome, surfaceRadiusAt } from './domeContext'

/**
 * GEODESIC DOME – proceduralna bryła kopuły
 * ---------------------------------------------------------------
 *  • pręty  – InstancedMesh (1 draw call niezależnie od częstotliwości)
 *  • węzły  – InstancedMesh kul
 *  • panele – BufferGeometry w jednostkach R=1, skalowana przez `scale={R}`
 *  • wejście – portal drzwiowy (przedsionek) od strony +Z
 *
 * Pręty i węzły mają stałą grubość w metrach – przy zmianie średnicy
 * przeliczamy jedynie macierze instancji, a nie geometrię.
 */

const DOOR_AZIMUTH = 0 // +Z – "przód" kopuły
const WINDOW_AZIMUTH = THREE.MathUtils.degToRad(70) // okno panoramiczne po prawej stronie wejścia
const WINDOW_SPREAD = THREE.MathUtils.degToRad(36)
const DOOR_CLEARANCE = THREE.MathUtils.degToRad(26)

const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

const _up = new THREE.Vector3(0, 1, 0)
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()

function buildPanelGeometry(dome, faceIds) {
  const pos = new Float32Array(faceIds.length * 9)
  faceIds.forEach((fi, k) => {
    dome.faces[fi].forEach((vi, j) => {
      pos.set(dome.vertices[vi], k * 9 + j * 3)
    })
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.computeVertexNormals() // geometria nieindeksowana → płaskie cieniowanie paneli
  return g
}

export default function GeodesicDome({ config, interior }) {
  const ctx = useDome()
  const { R, dome } = ctx
  const frame = FRAMES.find((f) => f.id === config.frame) ?? FRAMES[0]
  const cover = COVERS.find((c) => c.id === config.cover) ?? COVERS[0]

  // --- Podział paneli: poszycie / okno panoramiczne
  const { coverGeo, windowGeo } = useMemo(() => {
    const coverIds = []
    const windowIds = []
    dome.faces.forEach((tri, i) => {
      const c = tri.reduce((acc, vi) => acc.map((v, d) => v + dome.vertices[vi][d] / 3), [0, 0, 0])
      const az = Math.atan2(c[0], c[2])
      const relH = c[1] / dome.height
      const isWindow =
        config.panoramicWindow &&
        angleDiff(az, WINDOW_AZIMUTH) < WINDOW_SPREAD &&
        angleDiff(az, DOOR_AZIMUTH) > DOOR_CLEARANCE &&
        relH > 0.04 &&
        relH < 0.7
      ;(isWindow ? windowIds : coverIds).push(i)
    })
    return {
      coverGeo: buildPanelGeometry(dome, coverIds),
      windowGeo: windowIds.length ? buildPanelGeometry(dome, windowIds) : null,
    }
  }, [dome, config.panoramicWindow])

  useLayoutEffect(() => () => {
    coverGeo.dispose()
    windowGeo?.dispose()
  }, [coverGeo, windowGeo])

  // --- Instancje prętów i węzłów (przeliczane przy zmianie R)
  const struts = useRef()
  const hubs = useRef()
  useLayoutEffect(() => {
    dome.edges.forEach(([ia, ib], i) => {
      _a.fromArray(dome.vertices[ia]).multiplyScalar(R)
      _b.fromArray(dome.vertices[ib]).multiplyScalar(R)
      _dir.subVectors(_b, _a)
      const len = _dir.length()
      _q.setFromUnitVectors(_up, _dir.normalize())
      _s.set(1, len, 1)
      _m.compose(_a.add(_b).multiplyScalar(0.5), _q, _s)
      struts.current.setMatrixAt(i, _m)
    })
    struts.current.instanceMatrix.needsUpdate = true
    struts.current.computeBoundingSphere()

    dome.vertices.forEach((v, i) => {
      _m.makeTranslation(v[0] * R, v[1] * R, v[2] * R)
      hubs.current.setMatrixAt(i, _m)
    })
    hubs.current.instanceMatrix.needsUpdate = true
    hubs.current.computeBoundingSphere()
  }, [dome, R, frame.id])

  const coverOpacity = interior ? Math.min(cover.opacity, 0.28) : cover.opacity
  const coverTransparent = cover.transparent || interior

  return (
    <group>
      {/* Pręty */}
      <instancedMesh
        key={`s-${dome.frequency}-${frame.id}`}
        ref={struts}
        args={[undefined, undefined, dome.edges.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[frame.strutRadius, frame.strutRadius, 1, 8, 1]} />
        <meshStandardMaterial color={frame.color} metalness={frame.metalness} roughness={frame.roughness} />
      </instancedMesh>

      {/* Węzły */}
      <instancedMesh
        key={`h-${dome.frequency}-${frame.id}`}
        ref={hubs}
        args={[undefined, undefined, dome.vertices.length]}
        castShadow
      >
        <sphereGeometry args={[frame.hubRadius, 12, 8]} />
        <meshStandardMaterial color={frame.color} metalness={frame.metalness} roughness={frame.roughness * 0.8} />
      </instancedMesh>

      {/* Poszycie */}
      <mesh geometry={coverGeo} scale={R} castShadow={!coverTransparent} receiveShadow>
        <meshStandardMaterial
          color={cover.color}
          roughness={cover.roughness}
          metalness={0}
          side={THREE.DoubleSide}
          transparent={coverTransparent}
          opacity={coverOpacity}
          depthWrite={!coverTransparent}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      {/* Okno panoramiczne */}
      {windowGeo && (
        <mesh geometry={windowGeo} scale={R}>
          <meshPhysicalMaterial
            color="#a9c7d4"
            roughness={0.05}
            metalness={0.1}
            clearcoat={1}
            side={THREE.DoubleSide}
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      )}

      <DoorPortal ctx={ctx} cover={cover} frame={frame} />
    </group>
  )
}

/**
 * Przedsionek z drzwiami – wysunięty poza obrys kopuły (jak w realnych realizacjach).
 * Rozmiar drzwi jest stały (w metrach), głębokość przedsionka dopasowuje się do średnicy.
 */
function DoorPortal({ ctx, cover, frame }) {
  const { R, dome } = ctx
  const height = dome.height * R
  const doorH = Math.min(1.95, height * 0.7)
  const doorW = Math.min(0.95, doorH * 0.5)
  const wall = 0.08
  const baseR = dome.baseRadius * R
  const zFront = baseR + 0.28
  const zBack = Math.max(0, surfaceRadiusAt(ctx, doorH + 0.1) - 0.25)
  const depth = zFront - zBack
  const zMid = (zFront + zBack) / 2
  const outerW = doorW + wall * 2 + 0.1
  const glassDoor = cover.transparent

  const wood = '#7a5132'
  return (
    <group>
      {/* ściany boczne przedsionka */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (outerW - wall)) / 2, (doorH + 0.12) / 2, zMid]} castShadow receiveShadow>
          <boxGeometry args={[wall, doorH + 0.12, depth]} />
          <PortalMaterial cover={cover} />
        </mesh>
      ))}
      {/* dach przedsionka */}
      <mesh position={[0, doorH + 0.12, zMid]} castShadow receiveShadow>
        <boxGeometry args={[outerW + 0.04, 0.08, depth + 0.04]} />
        <PortalMaterial cover={cover} />
      </mesh>
      {/* ościeżnica */}
      <group position={[0, 0, zFront]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * (doorW + wall)) / 2, doorH / 2, 0]} castShadow>
            <boxGeometry args={[wall, doorH, 0.1]} />
            <meshStandardMaterial color={wood} roughness={0.65} />
          </mesh>
        ))}
        <mesh position={[0, doorH + wall / 2, 0]} castShadow>
          <boxGeometry args={[doorW + wall * 2, wall, 0.1]} />
          <meshStandardMaterial color={wood} roughness={0.65} />
        </mesh>
        {/* skrzydło drzwi */}
        <mesh position={[0, doorH / 2, 0]}>
          <boxGeometry args={[doorW, doorH, 0.04]} />
          {glassDoor ? (
            <meshStandardMaterial color="#cfe3e8" transparent opacity={0.35} roughness={0.05} depthWrite={false} />
          ) : (
            <meshStandardMaterial color="#5b3a22" roughness={0.6} />
          )}
        </mesh>
        {/* przeszklenie w drzwiach */}
        {!glassDoor && (
          <mesh position={[0, doorH * 0.68, 0.025]}>
            <boxGeometry args={[doorW * 0.62, doorH * 0.36, 0.01]} />
            <meshStandardMaterial color="#9fb9c4" roughness={0.1} metalness={0.3} />
          </mesh>
        )}
        {/* klamka */}
        <mesh position={[doorW * 0.36, doorH * 0.48, 0.05]}>
          <boxGeometry args={[0.12, 0.025, 0.03]} />
          <meshStandardMaterial color="#d0b070" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}

/** Ściany przedsionka w tym samym materiale co poszycie (folia → przezroczyste) */
function PortalMaterial({ cover }) {
  return cover.transparent ? (
    <meshStandardMaterial color={cover.color} roughness={cover.roughness} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
  ) : (
    <meshStandardMaterial color={cover.color} roughness={cover.roughness} />
  )
}
