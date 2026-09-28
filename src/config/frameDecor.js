/**
 * DEKORACJE MONTOWANE NA KONSTRUKCJI (belki = pręty, węzły = łączenia)
 * ---------------------------------------------------------------
 * Każdy pręt i węzeł ma dwie niezależne "warstwy": światło i roślinność,
 * więc np. lampki na sznurku mogą się przeplatać z pnączem na tej samej belce.
 *
 * Kod dekoracji (string): '<typ>:<wariant>', np. 'beam:warm', 'spot:blue', 'vine:ivy'.
 */

/** Barwy światła (hex = kolor emitowany przez oprawę i prawdziwe światło w scenie) */
export const LIGHT_COLORS = [
  { id: 'warm', name: 'Ciepła biel 2700 K', hex: '#ffbf73' },
  { id: 'neutral', name: 'Neutralna biel 4000 K', hex: '#ffe7c7' },
  { id: 'cold', name: 'Zimna biel 6500 K', hex: '#dbe8ff' },
  { id: 'red', name: 'Czerwony', hex: '#ff2d2d' },
  { id: 'orange', name: 'Pomarańczowy', hex: '#ff7a1a' },
  { id: 'yellow', name: 'Żółty', hex: '#ffd21a' },
  { id: 'green', name: 'Zielony', hex: '#2dff5e' },
  { id: 'cyan', name: 'Turkusowy', hex: '#1fe0ff' },
  { id: 'blue', name: 'Niebieski', hex: '#2f5bff' },
  { id: 'violet', name: 'Fioletowy', hex: '#8a3dff' },
  { id: 'magenta', name: 'Magenta', hex: '#ff29b8' },
]

export const VINE_VARIANTS = [
  { id: 'ivy', name: 'Bluszcz', leaf: '#3f8a3a', leaf2: '#5aa84b', flower: null },
  { id: 'bloom', name: 'Pnącze kwitnące', leaf: '#4a8f3c', leaf2: '#64ab50', flower: '#ff4fa3' },
  { id: 'wisteria', name: 'Glicynia', leaf: '#6aa045', leaf2: '#82b95a', flower: '#b69bff' },
]

export const POT_VARIANTS = [
  { id: 'trailing', name: 'Zwisająca (epipremnum)', leaf: '#3f8a3a' },
  { id: 'fern', name: 'Paproć', leaf: '#4f9a3c' },
]

/**
 * Typy dekoracji ("pędzle").
 *  target – 'edge' (belka) | 'hub' (węzeł)
 *  layer  – klucz w config.attach
 */
export const FRAME_DECOR = [
  {
    id: 'beam',
    name: 'Oświetlenie belkowe LED',
    short: 'Belkowe LED',
    description: 'Podłużna listwa LED montowana wzdłuż belki, od strony wnętrza.',
    target: 'edge',
    layer: 'edgeLight',
    variants: LIGHT_COLORS,
  },
  {
    id: 'spot',
    name: 'Oświetlenie punktowe na węzłach',
    short: 'Punktowe',
    description: 'Reflektor na łączeniu belek, skierowany do wnętrza.',
    target: 'hub',
    layer: 'hubLight',
    variants: LIGHT_COLORS,
  },
  {
    id: 'string',
    name: 'Lampki na sznurku',
    short: 'Lampki',
    description: 'Girlanda żarówek zwisająca swobodnie między węzłami belki.',
    target: 'edge',
    layer: 'edgeLight',
    variants: LIGHT_COLORS,
  },
  {
    id: 'vine',
    name: 'Pnącza na belkach',
    short: 'Pnącza',
    description: 'Roślinność oplatająca wybrane belki konstrukcji.',
    target: 'edge',
    layer: 'edgePlant',
    variants: VINE_VARIANTS,
  },
  {
    id: 'pot',
    name: 'Wisząca donica na węźle',
    short: 'Donice',
    description: 'Roślina w donicy podwieszonej pod łączeniem belek.',
    target: 'hub',
    layer: 'hubPlant',
    variants: POT_VARIANTS,
  },
]

export const ATTACH_LAYERS = ['edgeLight', 'edgePlant', 'hubLight', 'hubPlant']
export const emptyAttach = () => ({ edgeLight: {}, edgePlant: {}, hubLight: {}, hubPlant: {} })

export const getDecor = (id) => FRAME_DECOR.find((d) => d.id === id)

/** Rozkodowanie → { decor, variant, name } lub null */
export function resolveAttach(code) {
  if (!code || typeof code !== 'string') return null
  const [type, v] = code.split(':')
  const decor = getDecor(type)
  if (!decor) return null
  const variant = decor.variants.find((x) => x.id === v)
  if (!variant) return null
  return { code, decor, variant, name: `${decor.name} (${variant.name})` }
}

/** Czy kod pasuje do warstwy (walidacja linku) */
export const isValidAttach = (layer, code) => resolveAttach(code)?.decor.layer === layer
