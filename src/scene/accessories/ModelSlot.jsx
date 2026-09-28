import { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

/**
 * MODEL SLOT – jedno miejsce podmiany placeholdera na model .glb
 * ---------------------------------------------------------------
 *   <ModelSlot url={meta.model} fallback={<StovePlaceholder />} position={...} />
 *
 *  • url === null  → renderuje `fallback` (bryły-placeholdery)
 *  • url = '…glb'  → asynchronicznie ładuje model (useGLTF + Suspense),
 *                    w trakcie ładowania pokazuje `fallback`.
 *
 * Wymagania dla modeli: jednostki = metry, oś Y w górę, pivot na styku z podłożem
 * (lub w punkcie zawieszenia – dla głośników). Wtedy nie trzeba ruszać pozycjonowania.
 *
 * Każda instancja klonuje scenę, więc ten sam plik można użyć wiele razy
 * (np. 6 lamp, 5 donic) – geometria i materiały są współdzielone.
 */
export default function ModelSlot({ url, fallback, ...groupProps }) {
  if (!url) return <group {...groupProps}>{fallback}</group>
  return (
    <group {...groupProps}>
      <Suspense fallback={fallback}>
        <GltfModel url={url} />
      </Suspense>
    </group>
  )
}

function GltfModel({ url }) {
  // 🔌 Tu następuje asynchroniczne ładowanie modelu .glb.
  //    Aby użyć kompresji Draco: useGLTF(url, true) (dekoder pobierany z CDN)
  //    lub useGLTF(url, '/draco/') po skopiowaniu dekodera do /public/draco.
  const { scene } = useGLTF(url)
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return clone
  }, [scene])
  return <primitive object={object} />
}

/** Opcjonalny preload – wywołaj dla modeli, które mają być gotowe od razu. */
export const preloadModel = (url) => url && useGLTF.preload(url)
