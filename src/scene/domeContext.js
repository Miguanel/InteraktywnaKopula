import { createContext, useContext, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'

/**
 * Wspólne dane o bryle dla kopuły i akcesoriów:
 *  R        – aktualny (animowany) promień sfery w metrach
 *  dome     – topologia z buildGeodesicDome()
 *  baseY    – wysokość podłogi kopuły (0 lub wysokość podestu)
 *  night    – tryb nocny
 */
export const DomeContext = createContext(null)
export const useDome = () => useContext(DomeContext)

/** y powierzchni kopuły nad punktem odległym o d od osi (względem podłogi kopuły) */
export function surfaceHeightAt(ctx, d) {
  const { R, dome } = ctx
  return dome.centerY * R + Math.sqrt(Math.max(0, R * R - d * d))
}

/** promień poziomy powierzchni kopuły na wysokości y (względem podłogi kopuły) */
export function surfaceRadiusAt(ctx, y) {
  const { R, dome } = ctx
  const dy = y - dome.centerY * R
  return Math.sqrt(Math.max(0, R * R - dy * dy))
}

/**
 * Płynne "dogonienie" wartości docelowej (np. średnicy przy przesuwaniu suwaka).
 * Re-render następuje tylko w trakcie animacji.
 */
export function useDampedValue(target, lambda = 9) {
  const [value, setValue] = useState(target)
  const ref = useRef(target)
  useFrame((_, dt) => {
    const cur = ref.current
    if (cur === target) return
    let next = MathUtils.damp(cur, target, lambda, Math.min(dt, 1 / 20))
    if (Math.abs(next - target) < 1e-3) next = target
    ref.current = next
    setValue(next)
  })
  return value
}
