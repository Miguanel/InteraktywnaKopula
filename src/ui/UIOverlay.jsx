import { useConfigurator } from '../store/useConfigurator'
import { COVERS, DIAMETER, FRAMES, FRAME_FINISHES, FREQUENCIES, PRESETS } from '../config/catalog'
import { ACCESSORIES } from '../config/accessories'
import { computeSpecs, nf, summarizeItems, summarizePanels } from '../lib/specs'
import PanelEditor from './PanelEditor'
import InteriorEditor from './InteriorEditor'
import { OptionCard, RangeField, Section, Segmented, Swatch, ToggleRow } from './controls'
import Icon from './icons'

/**
 * UI OVERLAY – panel konfiguracji (desktop: kolumna po prawej, mobile: pod podglądem 3D)
 */
export default function UIOverlay({ onRequestQuote }) {
  const config = useConfigurator((s) => s.config)
  const interiorView = useConfigurator((s) => s.view.interior || s.view.selectedItem != null)
  const a = useConfigurator.getState()
  const specs = computeSpecs(config)
  const cover = COVERS.find((c) => c.id === config.cover)
  const freq = FREQUENCIES.find((f) => f.id === config.frequency)
  const freqTooSparse = config.diameter > freq.recommendedMax
  const hasInterior = config.items.length > 0 || ACCESSORIES.some((x) => x.interior && config.accessories[x.id])
  const showInteriorHint = hasInterior && !cover.transparent && !interiorView
  const finish = FRAME_FINISHES.find((f) => f.id === config.frameFinish)

  const groups = ACCESSORIES.reduce((acc, item) => {
    ;(acc[item.group] ||= []).push(item)
    return acc
  }, {})

  return (
    <div className="flex min-h-full flex-col">
      <header className="px-5 pt-6 pb-5 sm:px-6">
        <p className="text-[0.72rem] font-medium tracking-[0.22em] text-gold-500 uppercase">Domedron · pracownia kopuł</p>
        <h1 className="mt-1.5 font-serif text-[1.85rem] leading-[1.1] font-medium text-gold-gradient">Skonfiguruj swoją kopułę</h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-gold-100/65">
          Każda zmiana od razu pojawia się na modelu 3D. Gdy konfiguracja będzie gotowa, wyślij nam zapytanie –
          przygotujemy indywidualną ofertę.
        </p>
      </header>

      <Section index={1} title="Przeznaczenie">
        <div className="grid gap-2">
          {PRESETS.map((p) => (
            <OptionCard
              key={p.id}
              selected={config.preset === p.id}
              onClick={() => a.applyPreset(p.id)}
              title={p.name}
              subtitle={p.tagline}
              icon={p.icon}
              compact
            />
          ))}
        </div>
        <p className="mt-2.5 flex gap-1.5 text-[0.78rem] leading-snug text-gold-100/45">
          <Icon name="info" size={14} className="mt-px shrink-0" />
          Wybór ustawia zalecane wartości startowe – każdą opcję możesz zmienić niżej.
        </p>
      </Section>

      <Section index={2} title="Wymiary">
        <RangeField
          id="diameter"
          label="Średnica kopuły"
          value={config.diameter}
          min={DIAMETER.min}
          max={DIAMETER.max}
          step={DIAMETER.step}
          marks={DIAMETER.standard}
          format={(v) => `${nf(v)} m`}
          onChange={a.setDiameter}
        />
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ['Wysokość', `${nf(specs.height, 2)} m`],
            ['Powierzchnia', `${nf(specs.floorArea)} m²`],
            ['Kubatura', `${nf(specs.volume, 0)} m³`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-wine-950/50 px-2 py-2.5">
              <dt className="text-[0.7rem] tracking-wide text-gold-100/50 uppercase">{k}</dt>
              <dd className="mt-0.5 font-serif text-lg leading-tight text-gold-200 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-gold-100/70">Gęstość siatki</span>
            <span className="text-[0.78rem] text-gold-100/45">
              {specs.struts} prętów · {specs.hubs} węzłów
            </span>
          </div>
          <Segmented
            label="Gęstość siatki"
            value={config.frequency}
            onChange={a.setFrequency}
            options={FREQUENCIES.map((f) => ({ value: f.id, label: f.label, sub: f.name }))}
          />
          <p className={`mt-2 text-[0.8rem] leading-snug ${freqTooSparse ? 'text-gold-300' : 'text-gold-100/55'}`}>
            {freqTooSparse
              ? `Dla średnicy ${nf(config.diameter)} m zalecamy gęstszą siatkę – zwiększy sztywność konstrukcji.`
              : freq.description}
          </p>
        </div>
      </Section>

      <Section index={3} title="Konstrukcja">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {FRAMES.map((f) => (
            <OptionCard
              key={f.id}
              selected={config.frame === f.id}
              onClick={() => a.setFrame(f.id)}
              title={f.name}
              subtitle={f.description}
              compact
            />
          ))}
        </div>
        <div className="mt-4 mb-2 flex items-baseline justify-between">
          <span className="text-sm text-gold-100/70">Wykończenie prętów i węzłów</span>
          <span className="text-sm text-gold-300">{finish?.name}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {FRAME_FINISHES.map((f) => (
            <Swatch key={f.id} selected={config.frameFinish === f.id} onClick={() => a.setFrameFinish(f.id)} swatch={f.swatch} name={f.name} small />
          ))}
        </div>
      </Section>

      <Section index={4} title="Ściany i panele" aside={<span className="text-right text-sm text-gold-300">{cover.name}</span>}>
        <div className="flex flex-wrap gap-3.5">
          {COVERS.map((c) => (
            <Swatch key={c.id} selected={config.cover === c.id} onClick={() => a.setCover(c.id)} swatch={c.swatch} name={c.name} />
          ))}
        </div>
        <p className="mt-2.5 text-[0.82rem] text-gold-100/55">{cover.description}</p>
        {!cover.skeleton && (
          <div className="-mx-3 mt-3">
            <ToggleRow
              checked={config.panoramicWindow}
              onChange={() => a.setPanoramicWindow(!config.panoramicWindow)}
              title="Okno panoramiczne"
              description="Przeszklony sektor ścian z widokiem na krajobraz."
            />
          </div>
        )}
        <PanelEditor />
      </Section>

      <Section index={5} title="Otoczenie i oświetlenie">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-2 last:mb-0">
            <h3 className="mb-1 text-[0.72rem] font-medium tracking-[0.18em] text-gold-500/90 uppercase">{group}</h3>
            <div className="-mx-3">
              {items.map((item) => (
                <ToggleRow
                  key={item.id}
                  checked={config.accessories[item.id]}
                  onChange={() => a.toggleAccessory(item.id)}
                  title={item.name}
                  description={item.description}
                />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section index={6} title="Aranżacja wnętrza">
        {showInteriorHint && (
          <button
            type="button"
            onClick={() => a.setView({ interior: true })}
            className="mb-3 flex w-full items-center gap-2 rounded-lg border border-gold-600/40 bg-gold-400/5 px-3 py-2 text-left text-[0.83rem] text-gold-200 transition-colors hover:bg-gold-400/10"
          >
            <Icon name="eye" size={16} />
            <span>
              Poszycie zasłania wyposażenie wnętrza. <span className="underline underline-offset-2">Pokaż wnętrze</span>
            </span>
          </button>
        )}
        <InteriorEditor />
      </Section>

      <Section index={7} title="Podsumowanie">
        <Summary config={config} specs={specs} />
      </Section>

      {/* CTA – na desktopie przyklejone do dołu panelu */}
      <div className="sticky bottom-0 z-10 mt-auto border-t border-wine-700/80 bg-wine-900/95 px-5 py-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onRequestQuote}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-5 py-3.5 font-serif text-lg font-semibold text-wine-900 shadow-[0_8px_24px_-8px_rgb(226_184_102/0.6)] transition-transform hover:-translate-y-px active:translate-y-0"
        >
          Zapytaj o wycenę
          <Icon name="send" size={18} />
        </button>
        <p className="mt-2 text-center text-[0.75rem] text-gold-100/45">Bezpłatnie i bez zobowiązań</p>
      </div>
    </div>
  )
}

function Summary({ config, specs }) {
  const frame = FRAMES.find((f) => f.id === config.frame)
  const cover = COVERS.find((c) => c.id === config.cover)
  const freq = FREQUENCIES.find((f) => f.id === config.frequency)
  const acc = ACCESSORIES.filter((x) => config.accessories[x.id])
  const finish = FRAME_FINISHES.find((f) => f.id === config.frameFinish)
  const panels = summarizePanels(config)
  const items = summarizeItems(config)
  const rows = [
    ['Średnica', `${nf(config.diameter)} m`],
    ['Siatka', `${freq.label} ${freq.name.toLowerCase()}`],
    ['Konstrukcja', frame.name + (finish && finish.id !== 'natural' ? `, ${finish.name.toLowerCase()}` : '')],
    ['Poszycie', cover.name + (config.panoramicWindow && !cover.skeleton ? ' + okno panoramiczne' : '')],
  ]
  return (
    <div className="rounded-xl border border-wine-600/70 bg-wine-950/40 p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gold-100/55">{k}</dt>
            <dd className="text-right text-gold-100">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-wine-700/70 pt-3">
        {panels.length > 0 && (
          <>
            <p className="mb-1.5 text-[0.9rem] text-gold-100/55">Panele indywidualne</p>
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {panels.map((p) => (
                <li key={p.code} className="rounded-full bg-wine-700/70 px-2.5 py-1 text-[0.78rem] text-gold-100/90">
                  {p.name} ×{p.count}
                </li>
              ))}
            </ul>
          </>
        )}
        {items.length > 0 && (
          <>
            <p className="mb-1.5 text-[0.9rem] text-gold-100/55">Aranżacja wnętrza</p>
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {items.map((i) => (
                <li key={i.type} className="rounded-full bg-wine-700/70 px-2.5 py-1 text-[0.78rem] text-gold-100/90">
                  {i.name} ×{i.count}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mb-1.5 text-[0.9rem] text-gold-100/55">Otoczenie i oświetlenie</p>
        {acc.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {acc.map((x) => (
              <li key={x.id} className="rounded-full bg-wine-700/70 px-2.5 py-1 text-[0.78rem] text-gold-100/90">
                {x.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.85rem] text-gold-100/40">Bez dodatków</p>
        )}
      </div>
      <details className="group mt-3 border-t border-wine-700/70 pt-3 text-[0.82rem] text-gold-100/60">
        <summary className="cursor-pointer list-none text-gold-300 select-none marker:hidden">
          <span className="group-open:hidden">▸ Dane techniczne</span>
          <span className="hidden group-open:inline">▾ Dane techniczne</span>
        </summary>
        <ul className="mt-2 space-y-1">
          <li>Powierzchnia poszycia: {nf(specs.coverArea)} m²</li>
          <li>
            Węzły: {specs.hubs} · pręty: {specs.struts} · panele: {specs.panels}
          </li>
          <li>
            Typy prętów (osiowo):{' '}
            {specs.strutTypes.map((s) => `${s.label} ${nf(s.lengthM * 100, 0)} cm ×${s.count}`).join(', ')}
          </li>
        </ul>
        <p className="mt-2 text-gold-100/35">Wartości orientacyjne – ostateczny projekt przygotowujemy indywidualnie.</p>
      </details>
    </div>
  )
}
