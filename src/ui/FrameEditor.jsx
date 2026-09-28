import { useConfigurator } from '../store/useConfigurator'
import { FRAME_DECOR, getDecor, resolveAttach } from '../config/frameDecor'
import { summarizeFrame } from '../lib/specs'
import { Segmented } from './controls'
import Icon from './icons'

/** Ikony typów dekoracji (inline SVG, 24×24) */
const TYPE_ICON = {
  beam: (
    <>
      <path d="M3 17L21 7" strokeWidth="3.2" />
      <path d="M4.5 19.5L22 9.8" strokeDasharray="1.5 2.2" opacity=".75" />
    </>
  ),
  spot: (
    <>
      <circle cx="12" cy="6" r="2.6" />
      <path d="M9.5 8.5L5 20h14l-4.5-11.5" opacity=".6" />
    </>
  ),
  string: (
    <>
      <path d="M2 6c5 7 15 7 20 0" />
      {[5, 9, 12, 15, 19].map((x, i) => (
        <circle key={x} cx={x} cy={[9.6, 11.6, 12.2, 11.6, 9.6][i] + 1.6} r="1.3" fill="currentColor" />
      ))}
    </>
  ),
  vine: (
    <>
      <path d="M4 20L20 4" strokeWidth="2.4" />
      <path d="M8 16c-2-1-3-3-2-5 2 0 3.5 1.5 3.5 3.5M13 11c2 1 3 3 2 5-2 0-3.5-1.5-3.5-3.5M13.5 8.5c-.5-2 .5-4 2.5-4.5.5 2-.5 3.5-2 4.5" />
    </>
  ),
  pot: (
    <>
      <path d="M12 2v6" />
      <path d="M7.5 8h9l-1.2 4.5h-6.6z" />
      <path d="M9 12.5c-1 3-1 6 0 9M12 12.5v8M15 12.5c1 3 1 6 0 9" opacity=".7" />
    </>
  ),
  erase: (
    <>
      <path d="M16.5 3.5l4 4L10 18H6l-2.5-2.5z" />
      <path d="M11 9l4 4M6 18h14" />
    </>
  ),
}

function TypeIcon({ id }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {TYPE_ICON[id]}
    </svg>
  )
}

/**
 * EDYTOR KONSTRUKCJI – oświetlenie belkowe i punktowe, lampki na sznurku, pnącza i donice
 * nakładane bezpośrednio na belki i węzły modelu 3D.
 */
export default function FrameEditor() {
  const config = useConfigurator((s) => s.config)
  const editMode = useConfigurator((s) => s.view.editMode)
  const brush = useConfigurator((s) => s.view.frameBrush)
  const night = useConfigurator((s) => s.view.night)
  const { setEditMode, setFrameBrush, frameFillAll, clearFrame, setView } = useConfigurator.getState()
  const active = editMode === 'frame'
  const used = summarizeFrame(config)

  const info = resolveAttach(brush.code)
  const typeId = brush.code === 'erase' ? 'erase' : info?.decor.id
  const decor = info?.decor
  const isLight = decor && ['beam', 'spot', 'string'].includes(decor.id)

  const pickType = (id) => {
    if (id === 'erase') return setFrameBrush({ code: 'erase' })
    const d = getDecor(id)
    // zachowaj kolor światła przy przełączaniu między typami opraw
    const keep = info && d.variants.some((v) => v.id === info.variant.id) ? info.variant.id : d.variants[0].id
    setFrameBrush({ code: `${id}:${keep}` })
  }

  if (!active) {
    return (
      <div className="rounded-xl border border-wine-600/70 bg-wine-950/40 p-4">
        <p className="text-[0.84rem] leading-snug text-gold-100/60">
          Zamontuj oświetlenie belkowe i punktowe, lampki na sznurku albo roślinność bezpośrednio na wybranych belkach i
          łączeniach. Światło oświetla wnętrze w wybranym kolorze.
        </p>
        {used.length > 0 && <UsedList used={used} />}
        <button
          type="button"
          onClick={() => setEditMode('frame')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gold-500/60 px-4 py-2.5 text-gold-200 transition-colors hover:bg-gold-400/10"
        >
          <Icon name="brush" size={17} />
          {used.length ? 'Edytuj konstrukcję' : 'Projektuj na konstrukcji'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gold-500/70 bg-wine-950/50 p-4 shadow-[0_0_0_1px_rgb(226_184_102/0.25)_inset]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-gold-200">
          <span className="size-2 animate-pulse rounded-full bg-gold-400" />
          Tryb edycji konstrukcji
        </p>
        <button type="button" onClick={() => setEditMode('none')} className="rounded-lg bg-gold-gradient px-3 py-1.5 text-sm font-semibold text-wine-900">
          Gotowe
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Rodzaj dekoracji">
        {[...FRAME_DECOR, { id: 'erase', short: 'Gumka' }].map((d) => {
          const sel = typeId === d.id
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => pickType(d.id)}
              title={d.name ?? 'Usuń dekoracje z belki lub węzła'}
              className={[
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[0.75rem] leading-tight transition-colors',
                sel ? 'border-gold-400 bg-gold-400/12 text-gold-100' : 'border-wine-600/80 bg-wine-800/40 text-gold-100/70 hover:border-gold-600/70',
              ].join(' ')}
            >
              <span className={sel ? 'text-gold-300' : 'text-gold-400/80'}>
                <TypeIcon id={d.id} />
              </span>
              {d.short}
            </button>
          )
        })}
      </div>

      <p className="mt-2.5 text-[0.8rem] leading-snug text-gold-100/55">
        {typeId === 'erase'
          ? 'Kliknij belkę lub węzeł, aby usunąć z niego dekoracje.'
          : `${decor.description} Kliknij ${decor.target === 'edge' ? 'belkę' : 'węzeł (łączenie belek)'} na modelu.`}
      </p>

      {decor && (
        <div className="mt-3">
          <p className="mb-2 text-[0.72rem] font-medium tracking-[0.18em] text-gold-500/90 uppercase">
            {isLight ? 'Kolor światła' : 'Gatunek'}
          </p>
          {isLight ? (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kolor światła">
              {decor.variants.map((v) => {
                const sel = info.variant.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    title={v.name}
                    aria-label={v.name}
                    onClick={() => setFrameBrush({ code: `${decor.id}:${v.id}` })}
                    className={`size-8 rounded-full border-2 transition-transform ${sel ? 'scale-110 border-gold-100' : 'border-wine-500 hover:scale-105'}`}
                    style={{ background: v.hex, boxShadow: `0 0 ${sel ? 16 : 8}px ${v.hex}${sel ? 'cc' : '66'}` }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {decor.variants.map((v) => {
                const sel = info.variant.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setFrameBrush({ code: `${decor.id}:${v.id}` })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] transition-colors ${sel ? 'border-gold-400 bg-gold-400/12 text-gold-100' : 'border-wine-600 text-gold-100/70 hover:border-gold-600'}`}
                  >
                    <span className="size-3 rounded-full" style={{ background: v.flower ?? v.leaf }} />
                    {v.name}
                  </button>
                )
              })}
            </div>
          )}
          {isLight && <p className="mt-1.5 text-[0.78rem] text-gold-300/80">{info.variant.name}</p>}
        </div>
      )}

      <div className="mt-3.5">
        <Segmented
          label="Zakres"
          value={brush.tool}
          onChange={(tool) => setFrameBrush({ tool })}
          options={[
            { value: 'single', label: 'Pojedynczo', sub: decor?.target === 'hub' ? 'jeden węzeł' : 'jedna belka' },
            { value: 'ring', label: 'Cały poziom', sub: 'pierścień' },
          ]}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!decor}
          onClick={frameFillAll}
          className="rounded-lg border border-wine-500 px-3 py-2 text-sm text-gold-100/85 transition-colors hover:border-gold-600 hover:text-gold-100 disabled:opacity-40"
        >
          Na wszystkie {decor?.target === 'hub' ? 'węzły' : 'belki'}
        </button>
        <button
          type="button"
          onClick={clearFrame}
          className="rounded-lg border border-wine-500 px-3 py-2 text-sm text-gold-100/85 transition-colors hover:border-gold-600 hover:text-gold-100"
        >
          Wyczyść wszystko
        </button>
      </div>

      <button
        type="button"
        onClick={() => setView({ night: !night })}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-wine-800 px-3 py-2 text-sm text-gold-200 transition-colors hover:bg-wine-700"
      >
        <Icon name={night ? 'sun' : 'moon'} size={16} />
        {night ? 'Wróć do widoku dziennego' : 'Zobacz efekt świateł nocą'}
      </button>

      {used.length > 0 && <UsedList used={used} />}
    </div>
  )
}

function UsedList({ used }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {used.map((u) => (
        <li key={u.code} className="flex items-center gap-1.5 rounded-full bg-wine-700/70 py-1 pr-2.5 pl-1 text-[0.75rem] text-gold-100/90">
          <span
            className="size-4 rounded-full border border-wine-500"
            style={{ background: u.info?.variant.hex ?? u.info?.variant.flower ?? u.info?.variant.leaf }}
          />
          {u.info?.decor.short}: {u.info?.variant.name} ×{u.count}
        </li>
      ))}
    </ul>
  )
}
