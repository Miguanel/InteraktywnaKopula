import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { DIAMETER, PRESETS, DEFAULT_PRESET, FRAMES, COVERS, FREQUENCIES } from '../config/catalog'
import { ACCESSORY_IDS } from '../config/accessories'

/**
 * GLOBALNY STAN KONFIGURATORA (zustand)
 * ---------------------------------------------------------------
 * `config` – to, co klient kupuje (trafia do zapytania ofertowego i do linku).
 * `view`   – ustawienia podglądu (nie wpływają na ofertę).
 */

const presetConfig = (id) => structuredClone(PRESETS.find((p) => p.id === id)?.config ?? PRESETS[0].config)

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Walidacja – chroni przed "zepsutym" linkiem z parametrami */
function sanitize(raw = {}) {
  const base = { preset: DEFAULT_PRESET, ...presetConfig(DEFAULT_PRESET) }
  const c = { ...base, ...raw }
  const snap = (v) => Math.round(v / DIAMETER.step) * DIAMETER.step
  return {
    preset: PRESETS.some((p) => p.id === c.preset) ? c.preset : null,
    diameter: clamp(snap(Number(c.diameter) || DIAMETER.default), DIAMETER.min, DIAMETER.max),
    frequency: FREQUENCIES.some((f) => f.id === Number(c.frequency)) ? Number(c.frequency) : 3,
    frame: FRAMES.some((f) => f.id === c.frame) ? c.frame : FRAMES[0].id,
    cover: COVERS.some((f) => f.id === c.cover) ? c.cover : COVERS[0].id,
    panoramicWindow: Boolean(c.panoramicWindow),
    accessories: Object.fromEntries(ACCESSORY_IDS.map((id) => [id, Boolean(c.accessories?.[id])])),
  }
}

// ---------- Udostępnianie konfiguracji przez link (#c=...) ----------
const HASH_KEY = 'c'

export function encodeConfig(config) {
  const compact = {
    p: config.preset,
    d: config.diameter,
    f: config.frequency,
    fr: config.frame,
    cv: config.cover,
    w: config.panoramicWindow ? 1 : 0,
    a: ACCESSORY_IDS.filter((id) => config.accessories[id]),
  }
  return btoa(encodeURIComponent(JSON.stringify(compact)))
}

function decodeConfig(str) {
  try {
    const c = JSON.parse(decodeURIComponent(atob(str)))
    return sanitize({
      preset: c.p,
      diameter: c.d,
      frequency: c.f,
      frame: c.fr,
      cover: c.cv,
      panoramicWindow: c.w === 1,
      accessories: Object.fromEntries((c.a || []).map((id) => [id, true])),
    })
  } catch {
    return null
  }
}

function readConfigFromUrl() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const raw = params.get(HASH_KEY)
  return raw ? decodeConfig(raw) : null
}

export function getShareUrl(config) {
  const url = new URL(window.location.href)
  url.hash = `${HASH_KEY}=${encodeConfig(config)}`
  return url.toString()
}

// ---------- Store ----------
export const useConfigurator = create(
  subscribeWithSelector((set) => ({
    config: readConfigFromUrl() ?? sanitize({ preset: DEFAULT_PRESET }),

    view: {
      night: false,
      autoRotate: false,
      interior: false, // "rentgen" – półprzezroczyste poszycie
      showFigure: true, // sylwetka człowieka dla skali
      resetToken: 0, // inkrementacja = reset kamery
    },

    applyPreset: (id) =>
      set((s) => ({
        config: sanitize({ ...presetConfig(id), preset: id }),
        view: { ...s.view, interior: false },
      })),

    setDiameter: (diameter) => set((s) => ({ config: { ...s.config, diameter } })),
    setFrequency: (frequency) => set((s) => ({ config: { ...s.config, frequency } })),
    setFrame: (frame) => set((s) => ({ config: { ...s.config, frame } })),
    setCover: (cover) => set((s) => ({ config: { ...s.config, cover } })),
    setPanoramicWindow: (panoramicWindow) => set((s) => ({ config: { ...s.config, panoramicWindow } })),
    toggleAccessory: (id) =>
      set((s) => ({
        config: {
          ...s.config,
          accessories: { ...s.config.accessories, [id]: !s.config.accessories[id] },
        },
      })),

    setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
    resetCamera: () => set((s) => ({ view: { ...s.view, resetToken: s.view.resetToken + 1 } })),
  })),
)

// Synchronizacja z adresem URL (bez zaśmiecania historii przeglądarki)
if (typeof window !== 'undefined') {
  let t
  useConfigurator.subscribe(
    (s) => s.config,
    (config) => {
      clearTimeout(t)
      t = setTimeout(() => {
        try {
          history.replaceState(null, '', `#${HASH_KEY}=${encodeConfig(config)}`)
        } catch {
          /* np. sandboxowany iframe – ignorujemy */
        }
      }, 250)
    },
  )
}
