import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { DIAMETER, PRESETS, DEFAULT_PRESET, FRAMES, COVERS, FREQUENCIES, FRAME_FINISHES } from '../config/catalog'
import { ACCESSORY_IDS } from '../config/accessories'
import { ITEMS, getItem, MAX_ITEMS } from '../config/items'
import { isValidPanelCode } from '../config/panels'
import { buildGeodesicDome } from '../lib/geodesic'
import {
  attachByRule,
  clampItemPosition,
  maxItemDistance,
  panelsByRule,
  remapIndexed,
  remapPanels,
  ringOf,
  ringOfEdges,
  ringOfHubs,
} from '../lib/domeMath'
import { ATTACH_LAYERS, emptyAttach, isValidAttach, resolveAttach } from '../config/frameDecor'

/**
 * GLOBALNY STAN KONFIGURATORA (zustand)
 * ---------------------------------------------------------------
 * `config` – to, co klient kupuje (trafia do zapytania ofertowego i do linku):
 *    panels – { [indeks panelu]: kod materiału } – nadpisania poszycia bazowego
 *    items  – [{ uid, type, x, z, rot }] – elementy aranżacji (metry, radiany)
 *    attach – { edgeLight, edgePlant, hubLight, hubPlant }: { [indeks belki/węzła]: kod } – dekoracje konstrukcji
 * `view`   – ustawienia podglądu i edycji (nie wpływają na ofertę).
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const round2 = (v) => Math.round(v * 100) / 100
let uidCounter = 1
const newUid = () => `i${Date.now().toString(36)}${(uidCounter++).toString(36)}`

const domeFor = (config) => buildGeodesicDome(config.frequency)

/** Rozmieszczenie elementów presetu (współrzędne względne → metry) */
function presetItems(preset, config) {
  const dome = domeFor(config)
  const R = config.diameter / 2
  return (preset.items || []).map(([type, fr, deg, rotDeg]) => {
    const meta = getItem(type)
    const maxD = maxItemDistance(dome, R, meta)
    const floorR = dome.baseRadius * R
    const d = Math.min(fr * floorR, maxD)
    const a = (deg * Math.PI) / 180
    const x = Math.sin(a) * d
    const z = Math.cos(a) * d
    const rot = rotDeg === 'center' ? Math.atan2(-x, -z) : (rotDeg * Math.PI) / 180
    return { uid: newUid(), type, x: round2(x), z: round2(z), rot }
  })
}

function presetPanels(preset, config) {
  const dome = domeFor(config)
  return Object.assign({}, ...(preset.panelRules || []).map((r) => panelsByRule(dome, r)))
}

function presetAttach(preset, config) {
  const dome = domeFor(config)
  const out = emptyAttach()
  for (const rule of preset.frameRules || []) {
    const layer = resolveAttach(rule.code)?.decor.layer
    if (layer) Object.assign(out[layer], attachByRule(dome, rule))
  }
  return out
}

function buildPreset(id) {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0]
  const config = sanitize({ ...structuredClone(preset.config), preset: preset.id, panels: {}, items: [] })
  config.items = presetItems(preset, config)
  config.panels = presetPanels(preset, config)
  config.attach = presetAttach(preset, config)
  return config
}

/** Walidacja – chroni przed "zepsutym" linkiem z parametrami */
function sanitize(c = {}) {
  const snap = (v) => Math.round(v / DIAMETER.step) * DIAMETER.step
  const out = {
    preset: PRESETS.some((p) => p.id === c.preset) ? c.preset : null,
    diameter: clamp(snap(Number(c.diameter) || DIAMETER.default), DIAMETER.min, DIAMETER.max),
    frequency: FREQUENCIES.some((f) => f.id === Number(c.frequency)) ? Number(c.frequency) : 3,
    frame: FRAMES.some((f) => f.id === c.frame) ? c.frame : FRAMES[0].id,
    frameFinish: FRAME_FINISHES.some((f) => f.id === c.frameFinish) ? c.frameFinish : 'natural',
    cover: COVERS.some((f) => f.id === c.cover) ? c.cover : COVERS[0].id,
    panoramicWindow: Boolean(c.panoramicWindow),
    accessories: Object.fromEntries(ACCESSORY_IDS.map((id) => [id, Boolean(c.accessories?.[id])])),
    panels: {},
    items: [],
    attach: emptyAttach(),
  }
  const faceCount = buildGeodesicDome(out.frequency).faces.length
  for (const [k, code] of Object.entries(c.panels || {})) {
    const i = Number(k)
    if (Number.isInteger(i) && i >= 0 && i < faceCount && isValidPanelCode(code)) out.panels[i] = code
  }
  const dome = domeFor(out)
  for (const layer of ATTACH_LAYERS) {
    const max = layer.startsWith('edge') ? dome.edges.length : dome.vertices.length
    for (const [k, code] of Object.entries(c.attach?.[layer] || {})) {
      const i = Number(k)
      if (Number.isInteger(i) && i >= 0 && i < max && isValidAttach(layer, code)) out.attach[layer][i] = code
    }
  }
  const R = out.diameter / 2
  for (const it of (c.items || []).slice(0, MAX_ITEMS)) {
    const meta = getItem(it?.type)
    if (!meta) continue
    const [x, z] = clampItemPosition(dome, R, meta, Number(it.x) || 0, Number(it.z) || 0)
    out.items.push({ uid: it.uid || newUid(), type: it.type, x: round2(x), z: round2(z), rot: Number(it.rot) || 0 })
  }
  return out
}

// ---------- Udostępnianie konfiguracji przez link (#c=...) ----------
const HASH_KEY = 'c'

export function encodeConfig(config) {
  const byCode = {}
  for (const [i, code] of Object.entries(config.panels)) (byCode[code] ||= []).push(Number(i))
  const compact = {
    p: config.preset,
    d: config.diameter,
    f: config.frequency,
    fr: config.frame,
    ff: config.frameFinish,
    cv: config.cover,
    w: config.panoramicWindow ? 1 : 0,
    a: ACCESSORY_IDS.filter((id) => config.accessories[id]),
    pm: Object.entries(byCode),
    at: Object.fromEntries(
      ATTACH_LAYERS.map((layer) => {
        const g = {}
        for (const [i, code] of Object.entries(config.attach[layer])) (g[code] ||= []).push(Number(i))
        return [layer, Object.entries(g)]
      }),
    ),
    it: config.items.map((it) => [
      ITEMS.findIndex((m) => m.id === it.type),
      Math.round(it.x * 100),
      Math.round(it.z * 100),
      Math.round((it.rot * 180) / Math.PI),
    ]),
  }
  return btoa(encodeURIComponent(JSON.stringify(compact)))
}

function decodeConfig(str) {
  try {
    const c = JSON.parse(decodeURIComponent(atob(str)))
    const panels = {}
    for (const [code, ids] of c.pm || []) for (const i of ids) panels[i] = code
    const attach = emptyAttach()
    for (const layer of ATTACH_LAYERS) for (const [code, ids] of c.at?.[layer] || []) for (const i of ids) attach[layer][i] = code
    return sanitize({
      attach,
      preset: c.p,
      diameter: c.d,
      frequency: c.f,
      frame: c.fr,
      frameFinish: c.ff,
      cover: c.cv,
      panoramicWindow: c.w === 1,
      accessories: Object.fromEntries((c.a || []).map((id) => [id, true])),
      panels,
      items: (c.it || []).map(([t, x, z, r]) => ({
        type: ITEMS[t]?.id,
        x: x / 100,
        z: z / 100,
        rot: (r * Math.PI) / 180,
      })),
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
const HISTORY_LIMIT = 80
const COALESCE_MS = 450 // ciągłe zmiany (przeciąganie, suwak) tworzą jeden krok historii
let timeTravel = false
let lastChange = 0

export const useConfigurator = create(
  subscribeWithSelector((set, get) => {
    const patchConfig = (patch) => set((s) => ({ config: { ...s.config, ...patch } }))
    const updateItems = (fn) => set((s) => ({ config: { ...s.config, items: fn(s.config.items) } }))

    return {
      config: readConfigFromUrl() ?? buildPreset(DEFAULT_PRESET),

      view: {
        night: false,
        autoRotate: false,
        interior: false, // "rentgen" – półprzezroczyste poszycie
        showFigure: true, // sylwetka człowieka dla skali
        resetToken: 0, // inkrementacja = reset kamery
        topToken: 0, // inkrementacja = widok z góry
        selectedItem: null, // uid zaznaczonego elementu
        editMode: 'none', // 'none' | 'paint'
        brush: { code: 'decor:lace:neonYellow', tool: 'panel' }, // tool: 'panel' | 'ring'
        hoverFace: null,
        // edytor konstrukcji: code = kod dekoracji lub 'erase'; tool: 'single' | 'ring'
        frameBrush: { code: 'beam:warm', tool: 'single' },
        hoverFrame: null, // { kind: 'edge'|'hub', index }
      },

      // --- Presety i parametry bryły
      // --- Historia zmian (cofnij / ponów)
      past: [], // poprzednie konfiguracje (najnowsza na końcu)
      future: [], // konfiguracje "do przodu" po cofnięciu
      resetNotice: false, // komunikat z "Cofnij" po wyczyszczeniu
      undo: () =>
        set((s) => {
          if (!s.past.length) return s
          timeTravel = true
          return {
            config: s.past[s.past.length - 1],
            past: s.past.slice(0, -1),
            future: [s.config, ...s.future],
            resetNotice: false,
            view: { ...s.view, selectedItem: null, hoverFace: null, hoverFrame: null },
          }
        }),
      redo: () =>
        set((s) => {
          if (!s.future.length) return s
          timeTravel = true
          return {
            config: s.future[0],
            past: [...s.past, s.config],
            future: s.future.slice(1),
            view: { ...s.view, selectedItem: null, hoverFace: null, hoverFrame: null },
          }
        }),

      /** Pusta kopuła do projektowania od zera (można cofnąć) */
      resetAll: () =>
        set((s) => ({
          config: sanitize({ preset: null, diameter: DIAMETER.default, frequency: 3, cover: 'pvc-white', accessories: {} }),
          resetNotice: true,
          view: { ...s.view, interior: false, selectedItem: null, editMode: 'none', hoverFace: null, hoverFrame: null },
        })),
      dismissResetNotice: () => set({ resetNotice: false }),

      applyPreset: (id) =>
        set((s) => ({
          config: buildPreset(id),
          view: { ...s.view, interior: false, selectedItem: null },
        })),

      setDiameter: (diameter) =>
        set((s) => {
          // elementy skalują się razem z kopułą – aranżacja zachowuje proporcje
          const k = diameter / s.config.diameter
          const next = { ...s.config, diameter }
          const dome = domeFor(next)
          next.items = s.config.items.map((it) => {
            const [x, z] = clampItemPosition(dome, diameter / 2, getItem(it.type), it.x * k, it.z * k)
            return { ...it, x: round2(x), z: round2(z) }
          })
          return { config: next }
        }),

      setFrequency: (frequency) =>
        set((s) => {
          const panels = remapPanels(s.config.frequency, frequency, s.config.panels)
          const attach = Object.fromEntries(
            ATTACH_LAYERS.map((l) => [
              l,
              remapIndexed(s.config.frequency, frequency, s.config.attach[l], l.startsWith('edge') ? 'edge' : 'hub'),
            ]),
          )
          const next = { ...s.config, frequency, panels, attach }
          const dome = domeFor(next)
          next.items = s.config.items.map((it) => {
            const [x, z] = clampItemPosition(dome, next.diameter / 2, getItem(it.type), it.x, it.z)
            return { ...it, x: round2(x), z: round2(z) }
          })
          return { config: next, view: { ...s.view, hoverFace: null } }
        }),

      setFrame: (frame) => patchConfig({ frame }),
      setFrameFinish: (frameFinish) => patchConfig({ frameFinish }),
      setCover: (cover) => patchConfig({ cover }),
      setPanoramicWindow: (panoramicWindow) => patchConfig({ panoramicWindow }),
      toggleAccessory: (id) =>
        set((s) => ({
          config: { ...s.config, accessories: { ...s.config.accessories, [id]: !s.config.accessories[id] } },
        })),

      // --- Panele
      /** Maluje panel (lub cały pierścień) aktualnym pędzlem. Ponowne kliknięcie tym samym materiałem przywraca poszycie bazowe. */
      paintFace: (fi) =>
        set((s) => {
          const { code, tool } = s.view.brush
          const dome = domeFor(s.config)
          const targets = tool === 'ring' ? ringOf(dome, fi) : [fi]
          const panels = { ...s.config.panels }
          const toggleOff = tool === 'panel' && panels[fi] === code
          for (const i of targets) {
            if (toggleOff || code === 'base' || code === s.config.cover) delete panels[i]
            else panels[i] = code
          }
          return { config: { ...s.config, panels } }
        }),
      paintAll: () =>
        set((s) => {
          const { code } = s.view.brush
          if (code === 'base' || code === s.config.cover) return { config: { ...s.config, panels: {} } }
          const n = domeFor(s.config).faces.length
          return { config: { ...s.config, panels: Object.fromEntries(Array.from({ length: n }, (_, i) => [i, code])) } }
        }),
      clearPanels: () => patchConfig({ panels: {} }),
      setBrush: (patch) => set((s) => ({ view: { ...s.view, brush: { ...s.view.brush, ...patch } } })),
      setEditMode: (editMode) =>
        set((s) => ({
          view: { ...s.view, editMode, hoverFace: null, hoverFrame: null, selectedItem: editMode === 'none' ? s.view.selectedItem : null },
        })),
      setHoverFace: (hoverFace) => set((s) => (s.view.hoverFace === hoverFace ? s : { view: { ...s.view, hoverFace } })),

      // --- Dekoracje konstrukcji (belki i węzły)
      setFrameBrush: (patch) => set((s) => ({ view: { ...s.view, frameBrush: { ...s.view.frameBrush, ...patch } } })),
      setHoverFrame: (hoverFrame) =>
        set((s) => {
          const h = s.view.hoverFrame
          if (h?.kind === hoverFrame?.kind && h?.index === hoverFrame?.index) return s
          return { view: { ...s.view, hoverFrame } }
        }),
      /** Nakłada dekorację aktualnym pędzlem na belkę/węzeł (lub cały poziom). Gumka czyści obie warstwy. */
      applyFrame: (kind, index) =>
        set((s) => {
          const { code, tool } = s.view.frameBrush
          const dome = domeFor(s.config)
          const targets = tool === 'ring' ? (kind === 'edge' ? ringOfEdges(dome, index) : ringOfHubs(dome, index)) : [index]
          const attach = { ...s.config.attach }
          if (code === 'erase') {
            for (const l of ATTACH_LAYERS.filter((l) => l.startsWith(kind))) {
              attach[l] = { ...attach[l] }
              for (const i of targets) delete attach[l][i]
            }
          } else {
            const info = resolveAttach(code)
            if (!info || info.decor.target !== kind) return s
            const l = info.decor.layer
            attach[l] = { ...attach[l] }
            const toggleOff = tool === 'single' && attach[l][index] === code
            for (const i of targets) {
              if (toggleOff) delete attach[l][i]
              else attach[l][i] = code
            }
          }
          return { config: { ...s.config, attach } }
        }),
      frameFillAll: () =>
        set((s) => {
          const info = resolveAttach(s.view.frameBrush.code)
          if (!info) return s
          const dome = domeFor(s.config)
          const n = info.decor.target === 'edge' ? dome.edges.length : dome.vertices.length
          const l = info.decor.layer
          return {
            config: {
              ...s.config,
              attach: { ...s.config.attach, [l]: Object.fromEntries(Array.from({ length: n }, (_, i) => [i, info.code])) },
            },
          }
        }),
      clearFrame: () => patchConfig({ attach: emptyAttach() }),

      // --- Elementy aranżacji
      addItem: (type) => {
        const s = get()
        if (s.config.items.length >= MAX_ITEMS) return null
        const meta = getItem(type)
        const dome = domeFor(s.config)
        const R = s.config.diameter / 2
        const maxD = maxItemDistance(dome, R, meta)
        // szukamy wolnego miejsca po spirali od środka
        let spot = [0, 0]
        search: for (let d = 0; d <= maxD + 0.001; d += 0.35) {
          const steps = Math.max(1, Math.round((2 * Math.PI * d) / 0.5))
          for (let k = 0; k < steps; k++) {
            const a = Math.PI + (k / steps) * Math.PI * 2
            const x = Math.sin(a) * d
            const z = Math.cos(a) * d
            const free = s.config.items.every((it) => {
              const m = getItem(it.type)
              if (m.hang !== meta.hang) return true
              return Math.hypot(it.x - x, it.z - z) > m.radius + meta.radius
            })
            if (free) {
              spot = [x, z]
              break search
            }
          }
        }
        const item = { uid: newUid(), type, x: round2(spot[0]), z: round2(spot[1]), rot: Math.atan2(-spot[0], -spot[1]) || 0 }
        set((st) => ({
          config: { ...st.config, items: [...st.config.items, item] },
          view: { ...st.view, selectedItem: item.uid, editMode: 'none' },
        }))
        return item.uid
      },
      moveItem: (uid, x, z) =>
        updateItems((items) =>
          items.map((it) => {
            if (it.uid !== uid) return it
            const s = get()
            const [cx, cz] = clampItemPosition(domeFor(s.config), s.config.diameter / 2, getItem(it.type), x, z)
            return { ...it, x: round2(cx), z: round2(cz) }
          }),
        ),
      rotateItem: (uid, delta) =>
        updateItems((items) => items.map((it) => (it.uid === uid ? { ...it, rot: it.rot + delta } : it))),
      removeItem: (uid) =>
        set((s) => ({
          config: { ...s.config, items: s.config.items.filter((it) => it.uid !== uid) },
          view: { ...s.view, selectedItem: s.view.selectedItem === uid ? null : s.view.selectedItem },
        })),
      duplicateItem: (uid) => {
        const s = get()
        const src = s.config.items.find((it) => it.uid === uid)
        if (!src || s.config.items.length >= MAX_ITEMS) return
        const meta = getItem(src.type)
        const off = meta.radius * 2 + 0.1
        const [x, z] = clampItemPosition(domeFor(s.config), s.config.diameter / 2, meta, src.x + off, src.z)
        const item = { ...src, uid: newUid(), x: round2(x), z: round2(z) }
        set((st) => ({
          config: { ...st.config, items: [...st.config.items, item] },
          view: { ...st.view, selectedItem: item.uid },
        }))
      },
      clearItems: () => set((s) => ({ config: { ...s.config, items: [] }, view: { ...s.view, selectedItem: null } })),
      selectItem: (selectedItem) => set((s) => ({ view: { ...s.view, selectedItem } })),

      setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
      resetCamera: () => set((s) => ({ view: { ...s.view, resetToken: s.view.resetToken + 1 } })),
      topView: () => set((s) => ({ view: { ...s.view, topToken: s.view.topToken + 1, interior: true } })),
    }
  }),
)

// Zapis historii: każda zmiana konfiguracji odkłada poprzedni stan na stos "past"
useConfigurator.subscribe(
  (s) => s.config,
  (config, prev) => {
    if (timeTravel) {
      timeTravel = false
      lastChange = 0
      return
    }
    const now = Date.now()
    const coalesce = now - lastChange < COALESCE_MS
    lastChange = now
    if (coalesce) return
    useConfigurator.setState((s) => ({ past: [...s.past, prev].slice(-HISTORY_LIMIT), future: [] }))
  },
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
      }, 300)
    },
  )
}
