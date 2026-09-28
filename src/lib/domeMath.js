import { buildGeodesicDome } from './geodesic'

/**
 * Pomocnicza geometria kopuły (czysty JS – używana w store i w scenie).
 * Wszystkie wysokości liczone od podłogi kopuły, w metrach.
 */

/** Promień poziomy powierzchni kopuły na wysokości y */
export function surfaceRadius(dome, R, y) {
  const dy = y - dome.centerY * R
  return Math.sqrt(Math.max(0, R * R - dy * dy))
}

/** Wysokość powierzchni kopuły nad punktem odległym o d od osi */
export function surfaceHeight(dome, R, d) {
  return dome.centerY * R + Math.sqrt(Math.max(0, R * R - d * d))
}

/** Wysokość zawieszenia elementów podwieszanych (listwy LED) */
export const hangHeight = (dome, R) => Math.min(2.5, dome.height * R * 0.62)

/** Maksymalna odległość od osi, na jakiej zmieści się element (z zapasem od ściany) */
export function maxItemDistance(dome, R, item) {
  const MARGIN = 0.08
  if (item.hang) {
    const y = hangHeight(dome, R) + 0.25
    return Math.max(0, surfaceRadius(dome, R, y) - item.radius - MARGIN)
  }
  const top = Math.min(item.height, dome.height * R - 0.05)
  const r = Math.min(surfaceRadius(dome, R, 0), surfaceRadius(dome, R, top))
  return Math.max(0, r - item.radius - MARGIN)
}

/** Przycina pozycję elementu do wnętrza kopuły */
export function clampItemPosition(dome, R, item, x, z) {
  const max = maxItemDistance(dome, R, item)
  const d = Math.hypot(x, z)
  if (d <= max || d === 0) return [x, z]
  const k = max / d
  return [x * k, z * k]
}

const centroidCache = new WeakMap()

/** Środki ciężkości paneli (R=1, względem podłogi) */
export function faceCentroids(dome) {
  if (centroidCache.has(dome)) return centroidCache.get(dome)
  const out = dome.faces.map((tri) => {
    const c = [0, 0, 0]
    for (const vi of tri) for (let d = 0; d < 3; d++) c[d] += dome.vertices[vi][d] / 3
    return c
  })
  centroidCache.set(dome, out)
  return out
}

/** Indeksy paneli w tym samym "pierścieniu" (zbliżona wysokość środka) co panel fi */
export function ringOf(dome, fi) {
  const cs = faceCentroids(dome)
  const y = cs[fi][1]
  const tol = (dome.height / (dome.frequency * 3)) * 0.5
  return cs.map((c, i) => (Math.abs(c[1] - y) < tol ? i : -1)).filter((i) => i >= 0)
}

/**
 * Przeniesienie materiałów paneli między częstotliwościami siatki (2V/3V/4V):
 * każdy nowy panel przejmuje materiał najbliższego (kątowo) panelu starej siatki.
 */
export function remapPanels(fromFreq, toFreq, panels) {
  const entries = Object.entries(panels || {})
  if (!entries.length || fromFreq === toFreq) return panels || {}
  const a = buildGeodesicDome(fromFreq)
  const b = buildGeodesicDome(toFreq)
  const dir = (dome, c) => {
    const v = [c[0], c[1] - dome.centerY, c[2]]
    const l = Math.hypot(...v)
    return v.map((x) => x / l)
  }
  const aDirs = faceCentroids(a).map((c) => dir(a, c))
  const bDirs = faceCentroids(b).map((c) => dir(b, c))
  const out = {}
  bDirs.forEach((bd, bi) => {
    let best = -1
    let bestDot = -2
    aDirs.forEach((ad, ai) => {
      const dot = ad[0] * bd[0] + ad[1] * bd[1] + ad[2] * bd[2]
      if (dot > bestDot) {
        bestDot = dot
        best = ai
      }
    })
    const code = panels[best]
    if (code) out[bi] = code
  })
  return out
}

/** Panele spełniające regułę presetu (zakres wysokości względnej, opcjonalnie sektor) */
export function panelsByRule(dome, rule) {
  const cs = faceCentroids(dome)
  const out = {}
  cs.forEach((c, i) => {
    const relH = c[1] / dome.height
    if (relH < (rule.fromH ?? 0) || relH > (rule.toH ?? 1)) return
    if (rule.azimuth) {
      const az = (Math.atan2(c[0], c[2]) * 180) / Math.PI
      const diff = Math.abs(((az - rule.azimuth[0] + 540) % 360) - 180)
      if (diff > rule.azimuth[1]) return
    }
    if (rule.every && i % rule.every !== 0) return
    out[i] = rule.code
  })
  return out
}
