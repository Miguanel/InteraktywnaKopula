import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, Stars, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../store/useConfigurator'
import { buildGeodesicDome } from '../lib/geodesic'
import { DomeContext, useDampedValue } from './domeContext'
import GeodesicDome from './GeodesicDome'
import Accessories from './Accessories'
import ScaleFigure from './accessories/ScaleFigure'
import ItemsLayer from './items/ItemsLayer'
import FrameDecor from './frame/FrameDecor'
import { DECK_HEIGHT } from './accessories/Deck'

/**
 * DOME SCENE – Canvas, oświetlenie, otoczenie i kamera.
 */
export default function DomeScene() {
  const down = useRef([0, 0])
  // skróty klawiszowe dla zaznaczonego elementu: Delete – usuń, R/Q/E – obróć, Esc – odznacz
  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return
      const st = useConfigurator.getState()
      // Ctrl/Cmd+Z – cofnij, Ctrl/Cmd+Shift+Z lub Ctrl+Y – ponów
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
        e.preventDefault()
        if (e.key === 'y' || e.shiftKey) st.redo()
        else st.undo()
        return
      }
      const uid = st.view.selectedItem
      if (e.key === 'Escape') {
        if (uid) st.selectItem(null)
        else if (st.view.editMode !== 'none') st.setEditMode('none')
        return
      }
      if (!uid) return
      if (e.key === 'Delete' || e.key === 'Backspace') st.removeItem(uid)
      else if (e.key === 'r' || e.key === 'e') st.rotateItem(uid, Math.PI / 12)
      else if (e.key === 'q') st.rotateItem(uid, -Math.PI / 12)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="h-full w-full"
      onPointerDownCapture={(e) => {
        down.current = [e.clientX, e.clientY]
      }}
    >
    <Canvas
      onPointerMissed={(e) => {
        // kliknięcie w puste miejsce (bez obracania kamerą) odznacza element
        if (Math.hypot(e.clientX - down.current[0], e.clientY - down.current[1]) < 6) {
          useConfigurator.getState().selectItem(null)
        }
      }}
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [8, 4.5, 10], fov: 38, near: 0.1, far: 400 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className="touch-none"
      aria-label="Podgląd 3D kopuły – przeciągnij, aby obrócić; użyj kółka lub gestu, aby przybliżyć"
      onCreated={(state) => {
        // Tylko w trybie deweloperskim: dostęp do stanu sceny z konsoli (testy, zrzuty ekranu)
        if (import.meta.env.DEV) window.__r3f = state
      }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
    </div>
  )
}

function SceneContent() {
  const config = useConfigurator((s) => s.config)
  const night = useConfigurator((s) => s.view.night)
  const interior = useConfigurator((s) => s.view.interior)
  const showFigure = useConfigurator((s) => s.view.showFigure)
  const autoRotate = useConfigurator((s) => s.view.autoRotate)
  const resetToken = useConfigurator((s) => s.view.resetToken)
  const topToken = useConfigurator((s) => s.view.topToken)
  const selectedItem = useConfigurator((s) => s.view.selectedItem)
  const editMode = useConfigurator((s) => s.view.editMode)

  const dome = useMemo(() => buildGeodesicDome(config.frequency), [config.frequency])
  const R = useDampedValue(config.diameter / 2)
  const baseY = config.accessories.deck ? DECK_HEIGHT : 0
  const animatedBaseY = useDampedValue(baseY, 10)
  const ctx = useMemo(() => ({ R, dome, baseY, night }), [R, dome, baseY, night])

  return (
    <DomeContext.Provider value={ctx}>
      <Environment night={night} R={R} />
      <group position={[0, animatedBaseY, 0]}>
        {/* podczas aranżacji i edycji konstrukcji ściany robią się półprzezroczyste */}
        <GeodesicDome config={config} interior={interior || selectedItem != null || editMode === 'frame'} />
        <FrameDecor config={config} />
        <Accessories enabled={config.accessories} />
        <ItemsLayer />
        {showFigure && <ScaleFigure />}
      </group>
      <CameraRig R={R} height={dome.height * R + animatedBaseY} autoRotate={autoRotate} resetToken={resetToken} topToken={topToken} />
    </DomeContext.Provider>
  )
}

/** Światło, niebo, grunt – dzień / noc */
function Environment({ night, R }) {
  const sun = useRef()
  const shadowExtent = R + 4

  useEffect(() => {
    const cam = sun.current.shadow.camera
    cam.left = cam.bottom = -shadowExtent
    cam.right = cam.top = shadowExtent
    cam.updateProjectionMatrix()
  }, [shadowExtent])

  return (
    <>
      <color attach="background" args={[night ? '#0b0d1c' : '#cfd9e0']} />
      <fog attach="fog" args={[night ? '#0b0d1c' : '#d9e2e6', 45, 140]} />
      {night ? (
        <Stars radius={120} depth={40} count={2500} factor={4} saturation={0} fade speed={0.4} />
      ) : (
        <Sky distance={450} sunPosition={[60, 28, 40]} turbidity={6} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.85} />
      )}

      <hemisphereLight args={[night ? '#3a4470' : '#eef4ff', night ? '#10120e' : '#5b6b3a', night ? 0.25 : 1.1]} />
      <directionalLight
        ref={sun}
        position={night ? [-20, 30, -10] : [18, 22, 12]}
        intensity={night ? 0.25 : 2.6}
        color={night ? '#9fb2ff' : '#fff4e2'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />

      {/* grunt – trawa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[160, 64]} />
        <meshStandardMaterial color={night ? '#1c2616' : '#6f8a4b'} roughness={1} />
      </mesh>
      {/* delikatnie jaśniejsza "polana" pod kopułą */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[R + 3.5, 64]} />
        <meshStandardMaterial color={night ? '#202a18' : '#7a9552'} roughness={1} />
      </mesh>
    </>
  )
}

const DEFAULT_DIR = new THREE.Vector3(0.55, 0.32, 1).normalize()

/**
 * Kamera: OrbitControls + automatyczne "dopasowanie kadru" przy zmianie średnicy
 * (utrzymuje proporcje obrazu) oraz płynny reset widoku.
 */
function CameraRig({ R, height, autoRotate, resetToken, topToken }) {
  const controls = useRef()
  const { camera, size } = useThree()
  const prevR = useRef(R)
  const resetTarget = useRef(null)

  // odległość, przy której kopuła mieści się w kadrze (uwzględnia pionowe ekrany mobilne)
  const fitDistance = (r) => {
    const aspect = size.width / size.height
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    const sceneRadius = r * 1.08 + 1.3 // kopuła + taras / otoczenie
    return (sceneRadius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.0
  }

  // pierwszy kadr
  useEffect(() => {
    controls.current?.target.set(0, height * 0.42, 0)
    camera.position.copy(DEFAULT_DIR).multiplyScalar(fitDistance(R))
    camera.position.y += height * 0.35
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // reset widoku
  useEffect(() => {
    if (resetToken === 0) return
    const pos = DEFAULT_DIR.clone().multiplyScalar(fitDistance(R))
    pos.y += height * 0.35
    resetTarget.current = pos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken])

  // widok z góry (plan) – wygodny do aranżacji wnętrza
  useEffect(() => {
    if (!topToken) return
    resetTarget.current = new THREE.Vector3(0, fitDistance(R) * 1.02 + height, 0.02)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topToken])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const targetY = height * 0.42
    c.target.y = THREE.MathUtils.damp(c.target.y, targetY, 8, dt)

    // skalowanie odległości kamery proporcjonalnie do zmiany promienia
    if (prevR.current !== R) {
      const ratio = R / prevR.current
      const offset = camera.position.clone().sub(c.target).multiplyScalar(ratio)
      camera.position.copy(c.target).add(offset)
      prevR.current = R
    }

    if (resetTarget.current) {
      camera.position.lerp(resetTarget.current, 1 - Math.exp(-6 * dt))
      if (camera.position.distanceTo(resetTarget.current) < 0.05) resetTarget.current = null
    }

    c.minDistance = R * 1.4
    c.maxDistance = R * 7 + 12
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => (resetTarget.current = null)}
    />
  )
}
