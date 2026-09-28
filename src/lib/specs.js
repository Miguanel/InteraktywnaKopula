import { buildGeodesicDome } from './geodesic'
import { COVERS, FRAMES, FREQUENCIES, PRESETS } from '../config/catalog'
import { ACCESSORIES } from '../config/accessories'

const nf = (v, digits = 1) =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Parametry techniczne wyliczane z konfiguracji (wszystko w metrach). */
export function computeSpecs(config) {
  const dome = buildGeodesicDome(config.frequency)
  const R = config.diameter / 2
  const height = dome.height * R
  const baseR = dome.baseRadius * R
  const floorArea = Math.PI * baseR * baseR
  // objętość czaszy kulistej: V = π h² (3R − h) / 3
  const volume = (Math.PI * height * height * (3 * R - height)) / 3
  // powierzchnia poszycia = suma pól trójkątów
  let coverArea = 0
  for (const [a, b, c] of dome.faces) {
    const A = dome.vertices[a]
    const B = dome.vertices[b]
    const C = dome.vertices[c]
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const cx = u[1] * v[2] - u[2] * v[1]
    const cy = u[2] * v[0] - u[0] * v[2]
    const cz = u[0] * v[1] - u[1] * v[0]
    coverArea += Math.hypot(cx, cy, cz) / 2
  }
  coverArea *= R * R

  return {
    diameter: config.diameter,
    height,
    floorArea,
    volume,
    coverArea,
    hubs: dome.vertices.length,
    struts: dome.edges.length,
    panels: dome.faces.length,
    strutTypes: dome.strutTypes.map((s) => ({ ...s, lengthM: s.length * R })),
  }
}

/** Czytelne podsumowanie – używane w UI, w mailu i w payloadzie formularza. */
export function describeConfig(config) {
  const specs = computeSpecs(config)
  const preset = PRESETS.find((p) => p.id === config.preset)
  const freq = FREQUENCIES.find((f) => f.id === config.frequency)
  const frame = FRAMES.find((f) => f.id === config.frame)
  const cover = COVERS.find((c) => c.id === config.cover)
  const accessories = ACCESSORIES.filter((a) => config.accessories[a.id]).map((a) => a.name)

  const rows = [
    ['Przeznaczenie', preset?.name ?? 'Indywidualne'],
    ['Średnica', `${nf(config.diameter)} m`],
    ['Wysokość', `${nf(specs.height, 2)} m`],
    ['Pow. zabudowy', `${nf(specs.floorArea)} m²`],
    ['Siatka', `${freq.label} – ${freq.name}`],
    ['Konstrukcja', frame.name],
    ['Poszycie', cover.name],
    ['Okno panoramiczne', config.panoramicWindow ? 'Tak' : 'Nie'],
    ['Wyposażenie', accessories.length ? accessories.join(', ') : 'Brak'],
  ]

  const text = [
    'KONFIGURACJA KOPUŁY DOMEDRON',
    ...rows.map(([k, v]) => `• ${k}: ${v}`),
    '',
    'Dane techniczne (orientacyjne):',
    `• Kubatura: ${nf(specs.volume)} m³, powierzchnia poszycia: ${nf(specs.coverArea)} m²`,
    `• Węzły: ${specs.hubs}, pręty: ${specs.struts}, panele: ${specs.panels}`,
    `• Typy prętów: ${specs.strutTypes.map((s) => `${s.label} ${nf(s.lengthM * 100, 0)} cm ×${s.count}`).join(', ')}`,
  ].join('\n')

  return { rows, text, specs }
}

export { nf }
