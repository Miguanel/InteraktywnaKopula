import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { COVERS, FRAMES, FRAME_FINISHES } from '../config/catalog'
import { resolvePanel } from '../config/panels'
import { getPatternCanvas } from '../lib/patterns'
import { faceCentroids, ringOf } from '../lib/domeMath'
import { useConfigurator } from '../store/useConfigurator'
import { useDome, surfaceRadiusAt } from './domeContext'

/**
 * GEODESIC DOME – proceduralna bryła kopuły
 * ---------------------------------------------------------------
 *  • pręty  – InstancedMesh (1 draw call niezależnie od częstotliwości)
 *  • węzły  – InstancedMesh kul
 *  • panele – BufferGeometry w jednostkach R=1, skalowana przez `scale={R}`,
 *              grupowane wg materiału (poszycie / szkło / tkanina dekoracyjna / otwór)
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

/**
 * Geometria grupy paneli (w jednostkach R=1).
 * uvMode: 'continuous' – współrzędne sferyczne (wzór przechodzi przez panele),
 *         'panel'      – każdy trójkąt ma własne UV (0,0)(1,0)(0.5,1).
 */
function buildPanelGeometry(dome, faceIds, uvMode = null, tilesAround = 1) {
  const pos = new Float32Array(faceIds.length * 9)
  const uv = uvMode ? new Float32Array(faceIds.length * 6) : null
  const TAU = Math.PI * 2
  faceIds.forEach((fi, k) => {
    const tri = dome.faces[fi]
    tri.forEach((vi, j) => pos.set(dome.vertices[vi], k * 9 + j * 3))
    if (uvMode === 'panel') {
      uv.set([0, 0, 1, 0, 0.5, 1], k * 6)
    } else if (uvMode === 'continuous') {
      const sph = tri.map((vi) => {
        const [x, y, z] = dome.vertices[vi]
        const yc = y - dome.centerY
        return [Math.atan2(x, z), Math.acos(Math.max(-1, Math.min(1, yc / Math.hypot(x, yc, z)))), Math.hypot(x, z)]
      })
      // szew azymutu (±π) – rozwijamy trójkąt na jedną stronę
      const azs = sph.map((p) => p[0])
      if (Math.max(...azs) - Math.min(...azs) > Math.PI) sph.forEach((p) => p[0] < 0 && (p[0] += TAU))
      // wierzchołek na biegunie nie ma azymutu – bierzemy średnią sąsiadów
      sph.forEach((p, j) => {
        if (p[2] < 1e-4) {
          const others = sph.filter((_, o) => o !== j)
          p[0] = (others[0][0] + others[1][0]) / 2
        }
      })
      sph.forEach(([az, th], j) => uv.set([(az / TAU) * tilesAround, (th / TAU) * tilesAround], k * 6 + j * 2))
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.computeVertexNormals() // geometria nieindeksowana → płaskie cieniowanie paneli
  return g
}

/** Tekstury wzorów – jedna instancja na wzór (współdzielona przez wszystkie kolory) */
const textureCache = new Map()
function getPatternTexture(patternId) {
  if (textureCache.has(patternId)) return textureCache.get(patternId)
  const t = new THREE.CanvasTexture(getPatternCanvas(patternId))
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.flipY = false
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  textureCache.set(patternId, t)
  return t
}

/** Kod materiału każdego panelu (nadpisanie → okno panoramiczne → poszycie bazowe) */
function effectiveCodes(dome, config) {
  const cs = faceCentroids(dome)
  return cs.map((c, i) => {
    if (config.panels[i]) return config.panels[i]
    const az = Math.atan2(c[0], c[2])
    const relH = c[1] / dome.height
    if (
      config.panoramicWindow &&
      angleDiff(az, WINDOW_AZIMUTH) < WINDOW_SPREAD &&
      angleDiff(az, DOOR_AZIMUTH) > DOOR_CLEARANCE &&
      relH > 0.04 &&
      relH < 0.7
    )
      return 'glass'
    return config.cover === 'none' ? 'open' : config.cover
  })
}

export default function GeodesicDome({ config, interior }) {
  const ctx = useDome()
  const { R, dome, night } = ctx
  const baseFrame = FRAMES.find((f) => f.id === config.frame) ?? FRAMES[0]
  const finish = FRAME_FINISHES.find((f) => f.id === config.frameFinish) ?? FRAME_FINISHES[0]
  const frame = finish.color
    ? { ...baseFrame, color: finish.color, metalness: finish.metalness, roughness: finish.roughness }
    : baseFrame
  const cover = COVERS.find((c) => c.id === config.cover) ?? COVERS[0]
  const hasUV = config.items.some((it) => it.type === 'uvLamp')

  // --- Grupowanie paneli według materiału (1 mesh = 1 materiał)
  const codes = useMemo(() => effectiveCodes(dome, config), [dome, config.panels, config.cover, config.panoramicWindow]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    const byCode = new Map()
    codes.forEach((code, i) => {
      if (code === 'open') return
      if (!byCode.has(code)) byCode.set(code, [])
      byCode.get(code).push(i)
    })
    return [...byCode.entries()].map(([code, ids]) => ({ code, ids, info: resolvePanel(code) }))
  }, [codes])

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

      {/* Panele – po jednym meshu na materiał */}
      {groups.map((g) => (
        <PanelGroup key={g.code} dome={dome} R={R} group={g} interior={interior} night={night} hasUV={hasUV} />
      ))}

      <PanelPicker dome={dome} R={R} />

      {!cover.skeleton && <DoorPortal ctx={ctx} cover={cover} frame={frame} />}
    </group>
  )
}

function PanelGroup({ dome, R, group, interior, night, hasUV }) {
  const { info, ids } = group
  const pattern = info.kind === 'decor' ? info.pattern : null
  const uvMode = pattern ? pattern.mapping : null
  // liczba powtórzeń wzoru dookoła kopuły (liczba całkowita → brak szwu)
  const tilesAround = pattern?.tile ? Math.max(3, Math.round((2 * Math.PI * R) / pattern.tile)) : 1
  const geo = useMemo(
    () => buildPanelGeometry(dome, ids, uvMode, tilesAround),
    [dome, ids, uvMode, tilesAround],
  )
  useLayoutEffect(() => () => geo.dispose(), [geo])

  if (info.kind === 'cover') {
    const c = info.cover
    const transparent = c.transparent || interior
    const opacity = interior ? Math.min(c.opacity, 0.28) : c.opacity
    return (
      <mesh geometry={geo} scale={R} castShadow={!transparent} receiveShadow>
        <meshStandardMaterial
          color={c.color}
          roughness={c.roughness}
          side={THREE.DoubleSide}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>
    )
  }
  if (info.kind === 'glass') {
    return (
      <mesh geometry={geo} scale={R}>
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
    )
  }
  // tkanina dekoracyjna – fluorescencyjna: w nocy świeci, mocniej przy naświetlaczu UV
  const tex = getPatternTexture(pattern.id)
  const glow = night ? (hasUV ? 1.15 : 0.45) : 0.06
  return (
    <mesh geometry={geo} scale={R} receiveShadow>
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        color={info.color.hex}
        emissive={info.color.hex}
        emissiveIntensity={glow}
        alphaTest={0.45}
        transparent={interior}
        opacity={interior ? 0.35 : 1}
        depthWrite={!interior}
        roughness={0.85}
        side={THREE.DoubleSide}
        toneMapped={!night}
      />
    </mesh>
  )
}

/**
 * Niewidoczna warstwa do wybierania paneli w trybie edycji (raycasting → indeks trójkąta = indeks panelu).
 * Poza trybem edycji nie przechwytuje zdarzeń, więc elementy we wnętrzu można swobodnie przesuwać.
 */
function PanelPicker({ dome, R }) {
  const editMode = useConfigurator((s) => s.view.editMode)
  const hoverFace = useConfigurator((s) => s.view.hoverFace)
  const tool = useConfigurator((s) => s.view.brush.tool)
  const { paintFace, setHoverFace } = useConfigurator.getState()
  const all = useMemo(() => dome.faces.map((_, i) => i), [dome])
  const geo = useMemo(() => buildPanelGeometry(dome, all), [dome, all])
  const highlightIds = useMemo(() => {
    if (hoverFace == null || hoverFace >= dome.faces.length) return null
    return tool === 'ring' ? ringOf(dome, hoverFace) : [hoverFace]
  }, [dome, hoverFace, tool])
  const hlGeo = useMemo(() => (highlightIds ? buildPanelGeometry(dome, highlightIds) : null), [dome, highlightIds])
  const hlEdges = useMemo(() => (hlGeo ? new THREE.EdgesGeometry(hlGeo) : null), [hlGeo])
  useLayoutEffect(() => () => geo.dispose(), [geo])
  useLayoutEffect(() => () => {
    hlGeo?.dispose()
    hlEdges?.dispose()
  }, [hlGeo, hlEdges])

  if (editMode !== 'paint') return null
  return (
    <group>
      <mesh
        geometry={geo}
        scale={R}
        onPointerMove={(e) => {
          e.stopPropagation()
          setHoverFace(e.faceIndex)
        }}
        onPointerOut={() => setHoverFace(null)}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return // to był obrót kamery, nie kliknięcie
          paintFace(e.faceIndex)
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {hlGeo && (
        <group scale={R * 1.004}>
          <mesh geometry={hlGeo} renderOrder={10}>
            <meshBasicMaterial color="#e2b866" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <lineSegments geometry={hlEdges} renderOrder={11}>
            <lineBasicMaterial color="#f6e2a8" />
          </lineSegments>
        </group>
      )}
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
