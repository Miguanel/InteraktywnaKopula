import { COVERS } from './catalog'
import { DECOR_COLORS, DECOR_PATTERNS, getDecorColor, getPattern } from '../lib/patterns'

/**
 * MATERIAŁY POJEDYNCZYCH PANELI
 * ---------------------------------------------------------------
 * Każdy trójkąt kopuły może nadpisać poszycie bazowe. Kod materiału (string):
 *   '<id poszycia>'              – np. 'pvc-white', 'greenhouse'
 *   'glass'                      – przeszklenie
 *   'open'                       – brak panelu (otwór)
 *   'decor:<wzór>:<kolor>'       – tkanina dekoracyjna, np. 'decor:lace:neonYellow'
 */

export const SPECIAL_PANELS = [
  {
    code: 'glass',
    name: 'Przeszklenie',
    description: 'Poliwęglan / szkło – widok na zewnątrz.',
    swatch: 'linear-gradient(135deg,#d8ecf2 0%,#8fb2c0 60%,#cfe3ea 100%)',
  },
  {
    code: 'open',
    name: 'Otwór (bez panelu)',
    description: 'Wolne pole – wejście, wentylacja, "okno" w tkaninie.',
    swatch:
      'repeating-linear-gradient(135deg, transparent 0 6px, rgb(226 184 102 / .7) 6px 8px), #1b0b10',
  },
]

export const decorCode = (patternId, colorId) => `decor:${patternId}:${colorId}`

/** Rozkodowanie materiału panelu → opis do renderowania i podsumowania */
export function resolvePanel(code) {
  if (!code) return null
  if (code.startsWith('decor:')) {
    const [, p, c] = code.split(':')
    const pattern = getPattern(p)
    const color = getDecorColor(c)
    return { kind: 'decor', code, pattern, color, name: `${pattern.name} (${color.name.toLowerCase()})` }
  }
  if (code === 'glass') return { kind: 'glass', code, name: 'Przeszklenie' }
  if (code === 'open') return { kind: 'open', code, name: 'Otwór' }
  const cover = COVERS.find((c) => c.id === code)
  if (cover) return { kind: 'cover', code, cover, name: cover.name }
  return null
}

export const isValidPanelCode = (code) => resolvePanel(code) !== null

export { DECOR_PATTERNS, DECOR_COLORS }
