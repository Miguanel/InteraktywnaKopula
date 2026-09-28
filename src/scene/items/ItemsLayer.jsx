import { useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getItem } from '../../config/items'
import { useConfigurator } from '../../store/useConfigurator'
import { hangHeight, surfaceHeight } from '../../lib/domeMath'
import { useDome } from '../domeContext'
import ModelSlot from '../accessories/ModelSlot'
import {
  BeanbagPlaceholder,
  BedPlaceholder,
  FloorLampPlaceholder,
  LedBarPlaceholder,
  LedStripPlaceholder,
  PlantPotPlaceholder,
  RugPlaceholder,
  SpeakerPlaceholder,
  StovePlaceholder,
  SubwooferPlaceholder,
  TablePlaceholder,
  UvLampPlaceholder,
} from './placeholders'

/**
 * ITEMS LAYER – elementy aranżacji, które klient przeciąga po podłodze kopuły.
 *
 *  • klik / dotknięcie  → zaznaczenie (pasek akcji w podglądzie: obrót, kopia, usuń)
 *  • przeciągnięcie     → przesunięcie po płaszczyźnie podłogi (lub sufitu dla lamp podwieszanych),
 *                         pozycja jest przycinana do wnętrza kopuły w store
 *  • podczas przeciągania kamera (OrbitControls) jest wyłączona
 */

const PLACEHOLDERS = {
  ledBar: LedBarPlaceholder,
  floorLamp: FloorLampPlaceholder,
  ledStrip: LedStripPlaceholder,
  uvLamp: UvLampPlaceholder,
  speaker: SpeakerPlaceholder,
  subwoofer: SubwooferPlaceholder,
  bed: BedPlaceholder,
  beanbag: BeanbagPlaceholder,
  table: TablePlaceholder,
  rug: RugPlaceholder,
  stove: StovePlaceholder,
  plantPot: PlantPotPlaceholder,
}

/** Światła punktowe elementów (limit – każde światło kosztuje wydajność na telefonach) */
const LIGHTS = {
  ledBar: { y: -0.15, color: '#ffd29a', day: 0.5, night: 3.2, distance: 5 },
  floorLamp: { y: 1.4, color: '#ffc47a', day: 0.4, night: 3, distance: 5 },
  ledStrip: { y: 0.25, color: '#ffc57a', day: 0.2, night: 1.6, distance: 3 },
  uvLamp: { y: 1.2, z: 0.3, color: '#7b3cff', day: 0, night: 4, distance: 7 },
}
const MAX_ITEM_LIGHTS = 6

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _hit = new THREE.Vector3()
const _wp = new THREE.Vector3()

export default function ItemsLayer() {
  const items = useConfigurator((s) => s.config.items)
  const selected = useConfigurator((s) => s.view.selectedItem)
  const editMode = useConfigurator((s) => s.view.editMode)

  // które elementy dostają prawdziwe światło (pierwsze N)
  const lit = useMemo(() => {
    const set = new Set()
    for (const it of items) if (LIGHTS[it.type] && set.size < MAX_ITEM_LIGHTS) set.add(it.uid)
    return set
  }, [items])

  return items.map((it) => (
    <PlacedItem
      key={it.uid}
      item={it}
      selected={selected === it.uid}
      interactive={editMode !== 'paint'}
      withLight={lit.has(it.uid)}
    />
  ))
}

function PlacedItem({ item, selected, interactive, withLight }) {
  const meta = getItem(item.type)
  const ctx = useDome()
  const { R, dome, night } = ctx
  const controls = useThree((s) => s.controls)
  const group = useRef()
  const drag = useRef(null)
  const [hovered, setHovered] = useState(false)
  const { selectItem, moveItem } = useConfigurator.getState()

  const y = meta.hang ? hangHeight(dome, R) : 0
  const Placeholder = PLACEHOLDERS[item.type]
  const variant = useMemo(() => [...item.uid].reduce((a, c) => a + c.charCodeAt(0), 0) % 3, [item.uid])
  const light = withLight ? LIGHTS[item.type] : null

  const planeAt = (e) => {
    group.current.parent.getWorldPosition(_wp)
    _plane.constant = -(_wp.y + y)
    return e.ray.intersectPlane(_plane, _hit)
  }

  const handlers = interactive
    ? {
        onPointerDown: (e) => {
          e.stopPropagation()
          selectItem(item.uid)
          const hit = planeAt(e)
          if (!hit) return
          drag.current = { dx: item.x - hit.x, dz: item.z - hit.z }
          e.target.setPointerCapture?.(e.pointerId)
          if (controls) controls.enabled = false
          document.body.style.cursor = 'grabbing'
        },
        onPointerMove: (e) => {
          if (!drag.current) return
          e.stopPropagation()
          const hit = planeAt(e)
          if (hit) moveItem(item.uid, hit.x + drag.current.dx, hit.z + drag.current.dz)
        },
        onPointerUp: (e) => {
          if (!drag.current) return
          e.stopPropagation()
          drag.current = null
          e.target.releasePointerCapture?.(e.pointerId)
          if (controls) controls.enabled = true
          document.body.style.cursor = hovered ? 'grab' : ''
        },
        onPointerOver: (e) => {
          e.stopPropagation()
          setHovered(true)
          if (!drag.current) document.body.style.cursor = 'grab'
        },
        onPointerOut: () => {
          setHovered(false)
          if (!drag.current) document.body.style.cursor = ''
        },
      }
    : {}

  return (
    <group ref={group} position={[item.x, y, item.z]}>
      <group rotation={[0, item.rot, 0]} {...handlers}>
        <ModelSlot url={meta.model} fallback={<Placeholder night={night} variant={variant} />} />
        {/* niewidoczna "strefa chwytu" – ułatwia łapanie małych elementów palcem */}
        <mesh position={[0, meta.hang ? -0.1 : Math.max(0.1, meta.height / 2), 0]}>
          <cylinderGeometry args={[Math.max(0.35, meta.radius * 0.8), Math.max(0.35, meta.radius * 0.8), Math.max(0.2, meta.hang ? 0.3 : meta.height), 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        {light && (
          <pointLight
            position={[0, light.y, light.z ?? 0]}
            color={light.color}
            intensity={night ? light.night : light.day}
            distance={light.distance}
            decay={2}
          />
        )}
      </group>
      {item.type === 'stove' && <Chimney ctx={ctx} item={item} />}
      {(selected || hovered) && <SelectionRing meta={meta} hangY={y} selected={selected} />}
    </group>
  )
}

/** Komin pieca – zawsze wychodzi 0,7 m ponad poszycie, niezależnie od pozycji pieca */
function Chimney({ ctx, item }) {
  const d = Math.hypot(item.x, item.z)
  const stoveTop = 0.78
  const roof = surfaceHeight(ctx.dome, ctx.R, d)
  const top = roof + 0.7
  const len = top - stoveTop
  return (
    <group>
      <mesh position={[0, stoveTop + len / 2, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, len, 16]} />
        <meshStandardMaterial color="#2c2c2e" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, roof, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.08, 16]} />
        <meshStandardMaterial color="#7d7f83" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, top + 0.08, 0]} castShadow>
        <coneGeometry args={[0.15, 0.12, 16]} />
        <meshStandardMaterial color="#2c2c2e" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Złoty pierścień zaznaczenia na podłodze (dla lamp podwieszanych – także linia pionowa) */
function SelectionRing({ meta, hangY, selected }) {
  const r = Math.max(0.3, meta.radius)
  return (
    <group position={[0, -hangY + 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
        <ringGeometry args={[r + 0.04, r + 0.1, 48]} />
        <meshBasicMaterial color={selected ? '#e2b866' : '#f6e2a8'} transparent opacity={selected ? 0.95 : 0.5} depthWrite={false} />
      </mesh>
      {hangY > 0 && (
        <mesh position={[0, hangY / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, hangY, 4]} />
          <meshBasicMaterial color="#e2b866" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
