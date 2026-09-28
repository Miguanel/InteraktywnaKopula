import { useEffect, useState } from 'react'
import { useConfigurator, getShareUrl } from '../store/useConfigurator'
import { computeSpecs, nf } from '../lib/specs'
import Icon from './icons'

/** Nakładki na podgląd 3D: narzędzia widoku, wymiary, podpowiedź gestów. */
export default function ViewerOverlay() {
  const view = useConfigurator((s) => s.view)
  const config = useConfigurator((s) => s.config)
  const { setView, resetCamera } = useConfigurator.getState()
  const specs = computeSpecs(config)
  const [hint, setHint] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 6000)
    return () => clearTimeout(t)
  }, [])

  const share = async () => {
    const url = getShareUrl(config)
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Moja kopuła Domedron', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* anulowano / brak uprawnień do schowka (np. iframe bez allow="clipboard-write") */
    }
  }

  const tools = [
    { id: 'night', icon: view.night ? 'sun' : 'moon', label: view.night ? 'Widok dzienny' : 'Widok nocny', active: view.night, onClick: () => setView({ night: !view.night }) },
    { id: 'interior', icon: 'eye', label: 'Podgląd wnętrza', active: view.interior, onClick: () => setView({ interior: !view.interior }) },
    { id: 'rotate', icon: 'rotate', label: 'Automatyczny obrót', active: view.autoRotate, onClick: () => setView({ autoRotate: !view.autoRotate }) },
    { id: 'figure', icon: 'person', label: 'Sylwetka dla skali (175 cm)', active: view.showFigure, onClick: () => setView({ showFigure: !view.showFigure }) },
    { id: 'reset', icon: 'target', label: 'Wyśrodkuj widok', onClick: resetCamera },
    { id: 'share', icon: copied ? 'check' : 'share', label: copied ? 'Skopiowano link' : 'Udostępnij konfigurację', onClick: share },
  ]

  return (
    <div className="pointer-events-none absolute inset-0" onPointerDown={() => setHint(false)}>
      {/* marka */}
      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-wine-900/75 p-1.5 min-[420px]:pr-3.5 shadow-lg backdrop-blur-md sm:top-4 sm:left-4">
        <img src="./favicon.svg" alt="" className="size-7 rounded-full" />
        <span className="hidden font-serif text-[0.95rem] text-gold-200 min-[420px]:inline">Domedron</span>
        <span className="hidden text-xs text-gold-100/50 sm:inline">· podgląd 3D</span>
      </div>

      {/* narzędzia widoku */}
      <div
        role="toolbar"
        aria-label="Narzędzia podglądu"
        className="pointer-events-auto absolute top-3 right-3 flex flex-row gap-0.5 rounded-2xl bg-wine-900/75 p-1 shadow-lg backdrop-blur-md sm:top-4 sm:right-4 sm:flex-col sm:gap-1"
      >
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={t.onClick}
            aria-pressed={t.active}
            aria-label={t.label}
            title={t.label}
            className={[
              'group relative grid size-9 place-items-center rounded-xl transition-colors sm:size-10',
              t.active ? 'bg-gold-gradient text-wine-900' : 'text-gold-200 hover:bg-wine-700',
            ].join(' ')}
          >
            <Icon name={t.icon} size={19} />
            <span className="pointer-events-none absolute right-full mr-2 hidden rounded-md bg-wine-950/95 px-2 py-1 text-xs whitespace-nowrap text-gold-100 opacity-0 transition-opacity group-hover:opacity-100 md:block">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* wymiary */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-xl bg-wine-900/75 px-3.5 py-2 text-gold-100 shadow-lg backdrop-blur-md sm:bottom-4 sm:left-4">
        <Metric label="Ø" value={`${nf(config.diameter)} m`} />
        <span className="h-6 w-px bg-wine-600" />
        <Metric label="H" value={`${nf(specs.height, 2)} m`} />
        <span className="h-6 w-px bg-wine-600" />
        <Metric label="A" value={`${nf(specs.floorArea)} m²`} />
      </div>

      {/* podpowiedź gestów */}
      <div
        className={`absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-[0.82rem] whitespace-nowrap text-white/90 backdrop-blur transition-opacity duration-700 sm:bottom-5 ${hint ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="hidden sm:inline">Przeciągnij, aby obrócić · kółko myszy – przybliżenie</span>
        <span className="sm:hidden">Przesuń palcem, aby obrócić · uszczypnij, aby przybliżyć</span>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-serif text-sm text-gold-500">{label}</span>
      <span className="font-serif text-base text-gold-100 tabular-nums">{value}</span>
    </span>
  )
}
