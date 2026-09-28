/**
 * PROCEDURALNE GRAFIKI DEKORACYJNE (tkaniny / lycra w stylu festiwalowym)
 * ---------------------------------------------------------------
 * Każdy wzór jest rysowany na <canvas> jako BIAŁA tkanina z przezroczystymi
 * wycięciami (kanał alfa). Kolor nadaje materiał w 3D (color + emissive),
 * więc jeden bitmapowy wzór obsługuje wszystkie kolory neonowe.
 *
 * mapping:
 *   'continuous' – wzór płynnie przechodzi przez sąsiednie panele (tekstura kafelkowa)
 *   'panel'      – każdy trójkąt dostaje własny, wyśrodkowany motyw
 *
 * Aby dodać własną grafikę (np. od klienta): dopisz wpis w DECOR_PATTERNS
 * z polem `image: './patterns/moj-wzor.png'` (PNG z przezroczystością) –
 * zamiast `draw` zostanie użyty plik.
 */

const SIZE = 512

// deterministyczny generator losowy (wzór wygląda zawsze tak samo)
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rysuje maskę na podstawie funkcji (x, y) → alfa 0..1 (u,v w zakresie 0..1). */
function fromField(ctx, field, size = SIZE) {
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = field((x + 0.5) / size, (y + 0.5) / size)
      const i = (y * size + x) * 4
      d[i] = d[i + 1] = d[i + 2] = 255
      d[i + 3] = Math.max(0, Math.min(255, a * 255))
    }
  }
  ctx.putImageData(img, 0, 0)
}

const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// ---------- Wzory ciągłe (kafelkowe) ----------

/** Organiczna koronka – komórki Voronoi (jak lycra na kopułach festiwalowych). */
function drawLace(ctx) {
  const r = rng(7)
  const pts = Array.from({ length: 26 }, () => [r(), r()])
  fromField(ctx, (u, v) => {
    let f1 = 9
    let f2 = 9
    for (const [px, py] of pts) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const dx = u - (px + ox)
          const dy = v - (py + oy)
          const dd = dx * dx + dy * dy
          if (dd < f1) {
            f2 = f1
            f1 = dd
          } else if (dd < f2) f2 = dd
        }
      }
    }
    const edge = Math.sqrt(f2) - Math.sqrt(f1)
    // grube "żyłki" tkaniny między komórkami
    return 1 - smooth(0.035, 0.05, edge)
  })
}

/** Plaster miodu – heksagonalne wycięcia (Voronoi siatki przesuniętych rzędów). */
function drawHoneycomb(ctx) {
  const cols = 6
  const rows = 6 // parzysta liczba rzędów → kafel bezszwowy
  fromField(ctx, (u, v) => {
    const x = u * cols
    const y = v * rows
    const r0 = Math.floor(y)
    let f1 = 9
    let f2 = 9
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      const off = ((r % 2) + 2) % 2 ? 0.5 : 0
      const c0 = Math.floor(x - off)
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const dx = x - (c + off + 0.5)
        const dy = (y - (r + 0.5)) * 1.15
        const dd = dx * dx + dy * dy
        if (dd < f1) {
          f2 = f1
          f1 = dd
        } else if (dd < f2) f2 = dd
      }
    }
    const edge = Math.sqrt(f2) - Math.sqrt(f1)
    return 1 - smooth(0.11, 0.16, edge)
  })
}

/** Psychodeliczne fale. */
function drawWaves(ctx) {
  const TAU = Math.PI * 2
  fromField(ctx, (u, v) => {
    const w = Math.sin(v * TAU * 6 + Math.sin(u * TAU * 2) * 2.2 + Math.sin(u * TAU * 5) * 0.5)
    return smooth(-0.1, 0.1, w) * (1 - smooth(0.62, 0.78, w))
  })
}

/** Kręgi – nakładające się okręgi (motyw "kwiatu życia"). */
function drawRings(ctx) {
  const n = 6 // parzysta liczba rzędów → kafel bezszwowy
  fromField(ctx, (u, v) => {
    const x = u * n
    const y = v * n
    let ring = 9
    for (let r = Math.floor(y) - 1; r <= Math.floor(y) + 1; r++) {
      const off = ((r % 2) + 2) % 2 ? 0.5 : 0
      for (let c = Math.floor(x) - 1; c <= Math.floor(x) + 1; c++) {
        const d = Math.hypot(x - (c + off), y - r)
        ring = Math.min(ring, Math.abs(d - 0.62))
      }
    }
    return 1 - smooth(0.045, 0.07, ring)
  })
}

// ---------- Wzory "per panel" (UV trójkąta: A=(0,0) B=(1,0) C=(0.5,1), tekstura z flipY=false) ----------
const CENTROID = [0.5, 1 / 3]

/** Portale – duży okrągły otwór z pierścieniami i mniejszymi "oczami". */
function drawPortal(ctx) {
  fromField(ctx, (u, v) => {
    const dx = u - CENTROID[0]
    const dy = (v - CENTROID[1]) * 0.9
    const d = Math.hypot(dx, dy)
    const a = Math.atan2(dy, dx)
    const hole = d < 0.13 ? 0 : 1
    const ring = Math.abs(d - 0.19) < 0.025 ? 0 : 1
    // trzy małe otwory w narożnikach
    let eyes = 1
    for (let k = 0; k < 3; k++) {
      const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 3
      const ex = CENTROID[0] + Math.cos(ang) * 0.3
      const ey = CENTROID[1] + Math.sin(ang) * 0.3
      if (Math.hypot(u - ex, (v - ey) * 0.9) < 0.055) eyes = 0
    }
    // promieniste szczeliny
    const rays = d > 0.24 && d < 0.4 && Math.abs(Math.sin(a * 6)) > 0.93 ? 0 : 1
    return hole * ring * eyes * rays
  })
}

/** Mandala – płatki wokół środka. */
function drawMandala(ctx) {
  fromField(ctx, (u, v) => {
    const dx = u - CENTROID[0]
    const dy = (v - CENTROID[1]) * 0.9
    const d = Math.hypot(dx, dy)
    const a = Math.atan2(dy, dx)
    const petals = 0.2 + 0.07 * Math.cos(a * 8)
    const inner = 0.1 + 0.03 * Math.cos(a * 16)
    if (d < 0.045) return 1 // środek
    if (d < inner) return 0
    if (d < inner + 0.02) return 1
    if (d < petals) return Math.abs(Math.sin(a * 8)) < 0.35 ? 1 : 0
    if (d < petals + 0.025) return 1
    const outer = 0.36 + 0.03 * Math.cos(a * 24)
    if (d < outer) return Math.abs(Math.sin(a * 12)) > 0.55 ? 0 : 1
    return 1
  })
}

/** Słońce – promienie. */
function drawSun(ctx) {
  fromField(ctx, (u, v) => {
    const dx = u - CENTROID[0]
    const dy = (v - CENTROID[1]) * 0.9
    const d = Math.hypot(dx, dy)
    const a = Math.atan2(dy, dx)
    if (d < 0.08) return 1
    if (d < 0.11) return 0
    const ray = Math.abs(Math.sin(a * 9 + d * 12))
    return ray < 0.45 ? 1 : 0
  })
}

export const DECOR_PATTERNS = [
  { id: 'lace', name: 'Organiczna koronka', mapping: 'continuous', tile: 2.4, draw: drawLace },
  { id: 'portal', name: 'Portale', mapping: 'panel', draw: drawPortal },
  { id: 'mandala', name: 'Mandala', mapping: 'panel', draw: drawMandala },
  { id: 'honeycomb', name: 'Plaster miodu', mapping: 'continuous', tile: 1.6, draw: drawHoneycomb },
  { id: 'waves', name: 'Fale', mapping: 'continuous', tile: 2.2, draw: drawWaves },
  { id: 'rings', name: 'Kręgi', mapping: 'continuous', tile: 1.6, draw: drawRings },
  { id: 'sun', name: 'Słońce', mapping: 'panel', draw: drawSun },
]

/** Kolory tkanin (fluorescencyjne – świecą w świetle UV w trybie nocnym). */
export const DECOR_COLORS = [
  { id: 'neonYellow', name: 'Neon żółty', hex: '#e4ff2a' },
  { id: 'uvGreen', name: 'Zielony UV', hex: '#3dff7a' },
  { id: 'magenta', name: 'Magenta', hex: '#ff2fb0' },
  { id: 'orange', name: 'Pomarańcz', hex: '#ff8a1c' },
  { id: 'cyan', name: 'Cyjan', hex: '#23e5ff' },
  { id: 'violet', name: 'Fiolet', hex: '#9b5cff' },
  { id: 'white', name: 'Biały', hex: '#f4f1ea' },
  { id: 'gold', name: 'Złoty', hex: '#e2b866' },
]

export const getPattern = (id) => DECOR_PATTERNS.find((p) => p.id === id) ?? DECOR_PATTERNS[0]
export const getDecorColor = (id) => DECOR_COLORS.find((c) => c.id === id) ?? DECOR_COLORS[0]

// ---------- Cache płócien ----------
const canvasCache = new Map()

/** Zwraca <canvas> z białym wzorem na przezroczystym tle (generowany raz). */
export function getPatternCanvas(id) {
  if (canvasCache.has(id)) return canvasCache.get(id)
  const p = getPattern(id)
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  p.draw(c.getContext('2d'))
  canvasCache.set(id, c)
  return c
}

const previewCache = new Map()

/** Miniatura do UI: kolorowy wzór na ciemnym tle (data URL). */
export function getPatternPreview(id, hex = '#e4ff2a', size = 96) {
  const key = `${id}|${hex}|${size}`
  if (previewCache.has(key)) return previewCache.get(key)
  const src = getPatternCanvas(id)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.drawImage(src, 0, 0, size, size)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#1b0b10'
  ctx.fillRect(0, 0, size, size)
  const url = c.toDataURL('image/png')
  previewCache.set(key, url)
  return url
}
