import { useMemo } from 'react'
import { useConfigurator } from '../store/useConfigurator'
import { COVERS } from '../config/catalog'
import { SPECIAL_PANELS, DECOR_PATTERNS, DECOR_COLORS, decorCode, resolvePanel } from '../config/panels'
import { getPatternPreview } from '../lib/patterns'
import { summarizePanels } from '../lib/specs'
import { Segmented } from './controls'
import Icon from './icons'

/**
 * EDYTOR PANELI – wybór materiału ("pędzla") i malowanie trójkątów kopuły w podglądzie 3D.
 */
export default function PanelEditor() {
  const config = useConfigurator((s) => s.config)
  const editMode = useConfigurator((s) => s.view.editMode)
  const brush = useConfigurator((s) => s.view.brush)
  const { setEditMode, setBrush, paintAll, clearPanels } = useConfigurator.getState()
  const active = editMode === 'paint'
  const used = summarizePanels(config)

  const brushInfo = resolvePanel(brush.code)
  const decorPattern = brushInfo?.kind === 'decor' ? brushInfo.pattern.id : DECOR_PATTERNS[0].id
  const decorColor = brushInfo?.kind === 'decor' ? brushInfo.color.id : DECOR_COLORS[0].id

  const baseOptions = useMemo(
    () => [
      ...COVERS.filter((c) => !c.skeleton).map((c) => ({ code: c.id, name: c.name, swatch: c.swatch })),
      ...SPECIAL_PANELS,
    ],
    [],
  )

  if (!active) {
    return (
      <div className="mt-4 rounded-xl border border-wine-600/70 bg-wine-950/40 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-wine-700/80 text-gold-300">
            <Icon name="brush" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gold-100">Projektuj panele</p>
            <p className="mt-0.5 text-[0.82rem] leading-snug text-gold-100/55">
              Nadaj wybranym trójkątom inny materiał: przeszklenie, otwór lub tkaninę dekoracyjną z grafiką.
            </p>
          </div>
        </div>
        {used.length > 0 && <UsedPanels used={used} />}
        <button
          type="button"
          onClick={() => setEditMode('paint')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gold-500/60 px-4 py-2.5 text-gold-200 transition-colors hover:bg-gold-400/10"
        >
          <Icon name="brush" size={17} />
          {used.length ? 'Edytuj panele' : 'Zacznij projektować'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-gold-500/70 bg-wine-950/50 p-4 shadow-[0_0_0_1px_rgb(226_184_102/0.25)_inset]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-gold-200">
          <span className="size-2 animate-pulse rounded-full bg-gold-400" />
          Tryb edycji paneli
        </p>
        <button
          type="button"
          onClick={() => setEditMode('none')}
          className="rounded-lg bg-gold-gradient px-3 py-1.5 text-sm font-semibold text-wine-900"
        >
          Gotowe
        </button>
      </div>
      <p className="mb-3 text-[0.82rem] leading-snug text-gold-100/60">
        Wybierz materiał, a potem klikaj panele na modelu. Ponowne kliknięcie tym samym materiałem przywraca poszycie
        bazowe.
      </p>

      <Segmented
        label="Zakres malowania"
        value={brush.tool}
        onChange={(tool) => setBrush({ tool })}
        options={[
          { value: 'panel', label: 'Panel', sub: 'pojedynczy' },
          { value: 'ring', label: 'Pierścień', sub: 'cały poziom' },
        ]}
      />

      <h4 className="mt-4 mb-2 text-[0.72rem] font-medium tracking-[0.18em] text-gold-500/90 uppercase">Materiały</h4>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
        <BrushTile
          selected={brush.code === 'base'}
          onClick={() => setBrush({ code: 'base' })}
          label="Poszycie bazowe"
          style={{ background: COVERS.find((c) => c.id === config.cover)?.swatch }}
          icon="undo"
        />
        {baseOptions.map((o) => (
          <BrushTile
            key={o.code}
            selected={brush.code === o.code}
            onClick={() => setBrush({ code: o.code })}
            label={o.name}
            style={{ background: o.swatch }}
          />
        ))}
      </div>

      <h4 className="mt-4 mb-2 text-[0.72rem] font-medium tracking-[0.18em] text-gold-500/90 uppercase">
        Tkaniny dekoracyjne
      </h4>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
        {DECOR_PATTERNS.map((p) => {
          const hex = DECOR_COLORS.find((c) => c.id === decorColor)?.hex
          return (
            <BrushTile
              key={p.id}
              selected={brush.code === decorCode(p.id, decorColor)}
              onClick={() => setBrush({ code: decorCode(p.id, decorColor) })}
              label={p.name}
              style={{ backgroundImage: `url(${getPatternPreview(p.id, hex)})`, backgroundSize: 'cover' }}
            />
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Kolor tkaniny">
        {DECOR_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={decorColor === c.id}
            title={c.name}
            aria-label={c.name}
            onClick={() => setBrush({ code: decorCode(decorPattern, c.id) })}
            className={[
              'size-7 rounded-full border-2 transition-transform',
              decorColor === c.id && brushInfo?.kind === 'decor'
                ? 'scale-110 border-gold-200 ring-2 ring-gold-400/40'
                : 'border-wine-500 hover:scale-105',
            ].join(' ')}
            style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}55` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[0.78rem] leading-snug text-gold-100/45">
        Tkaniny są fluorescencyjne – włącz widok nocny i dodaj naświetlacz UV, aby zobaczyć efekt.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={paintAll}
          className="rounded-lg border border-wine-500 px-3 py-2 text-sm text-gold-100/85 transition-colors hover:border-gold-600 hover:text-gold-100"
        >
          Wypełnij wszystkie
        </button>
        <button
          type="button"
          onClick={clearPanels}
          className="rounded-lg border border-wine-500 px-3 py-2 text-sm text-gold-100/85 transition-colors hover:border-gold-600 hover:text-gold-100"
        >
          Wyczyść panele
        </button>
      </div>
      {used.length > 0 && <UsedPanels used={used} />}
    </div>
  )
}

function BrushTile({ selected, onClick, label, style, icon }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} title={label} className="group flex flex-col items-center gap-1 text-center">
      <span
        className={[
          'relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg border-2 transition-all',
          selected ? 'border-gold-300 ring-2 ring-gold-400/40' : 'border-wine-600 group-hover:border-gold-600',
        ].join(' ')}
        style={style}
      >
        {icon && (
          <span className="grid size-6 place-items-center rounded-full bg-wine-900/80 text-gold-200">
            <Icon name={icon} size={14} />
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-[0.68rem] leading-tight text-gold-100/65">{label}</span>
    </button>
  )
}

function UsedPanels({ used }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {used.map((u) => (
        <li key={u.code} className="flex items-center gap-1.5 rounded-full bg-wine-700/70 py-1 pr-2.5 pl-1 text-[0.75rem] text-gold-100/90">
          <span
            className="size-4 rounded-full border border-wine-500"
            style={
              u.info?.kind === 'decor'
                ? { background: u.info.color.hex }
                : u.info?.kind === 'cover'
                  ? { background: u.info.cover.swatch }
                  : { background: SPECIAL_PANELS.find((s) => s.code === u.code)?.swatch }
            }
          />
          {u.name} ×{u.count}
        </li>
      ))}
    </ul>
  )
}
