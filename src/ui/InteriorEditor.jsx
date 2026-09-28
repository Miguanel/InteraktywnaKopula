import { useConfigurator } from '../store/useConfigurator'
import { ITEMS, ITEM_GROUPS, MAX_ITEMS, getItem } from '../config/items'
import Icon from './icons'

/**
 * ARANŻACJA WNĘTRZA – katalog elementów do dodania + lista elementów w kopule.
 * Przesuwanie odbywa się bezpośrednio w podglądzie 3D (przeciągnij element).
 */
export default function InteriorEditor() {
  const items = useConfigurator((s) => s.config.items)
  const selected = useConfigurator((s) => s.view.selectedItem)
  const { addItem, selectItem, removeItem, clearItems } = useConfigurator.getState()
  const full = items.length >= MAX_ITEMS

  return (
    <div>
      <p className="mb-3 flex gap-1.5 text-[0.82rem] leading-snug text-gold-100/55">
        <Icon name="info" size={15} className="mt-px shrink-0" />
        Dodaj element, a potem przeciągnij go na modelu w wybrane miejsce. Zaznaczony element możesz obrócić, powielić lub
        usunąć.
      </p>

      {ITEM_GROUPS.map((group) => (
        <div key={group} className="mb-3">
          <h3 className="mb-1.5 text-[0.72rem] font-medium tracking-[0.18em] text-gold-500/90 uppercase">{group}</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEMS.filter((i) => i.group === group).map((i) => (
              <button
                key={i.id}
                type="button"
                disabled={full}
                onClick={() => addItem(i.id)}
                title={i.description}
                className="group flex items-center gap-2 rounded-lg border border-wine-600/80 bg-wine-800/50 px-2.5 py-2 text-left text-[0.84rem] leading-tight text-gold-100/90 transition-colors hover:border-gold-600/70 hover:bg-wine-800 disabled:opacity-40"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-wine-700 text-gold-300 transition-colors group-hover:bg-gold-500 group-hover:text-wine-900">
                  <Icon name="plus" size={14} />
                </span>
                {i.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-xl border border-wine-600/70 bg-wine-950/40">
        <div className="flex items-center justify-between border-b border-wine-700/70 px-3.5 py-2.5">
          <span className="text-sm text-gold-100/70">
            W kopule: <span className="font-semibold text-gold-200 tabular-nums">{items.length}</span>
            <span className="text-gold-100/40"> / {MAX_ITEMS}</span>
          </span>
          {items.length > 0 && (
            <button type="button" onClick={clearItems} className="text-[0.8rem] text-gold-400 hover:text-gold-200">
              Usuń wszystkie
            </button>
          )}
        </div>
        {items.length ? (
          <ul className="scrollbar-thin max-h-56 overflow-y-auto p-1.5">
            {items.map((it) => {
              const meta = getItem(it.type)
              const isSel = it.uid === selected
              return (
                <li key={it.uid}>
                  <div
                    className={[
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                      isSel ? 'bg-gold-400/12 ring-1 ring-gold-500/50' : 'hover:bg-wine-800/70',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => selectItem(isSel ? null : it.uid)}
                      className="min-w-0 flex-1 truncate text-left text-[0.86rem] text-gold-100/90"
                    >
                      {meta.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(it.uid)}
                      aria-label={`Usuń: ${meta.name}`}
                      className="grid size-7 place-items-center rounded-md text-gold-100/50 hover:bg-wine-700 hover:text-gold-200"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-3.5 py-3 text-[0.84rem] text-gold-100/40">Brak elementów – dodaj pierwszy z katalogu powyżej.</p>
        )}
      </div>
    </div>
  )
}
