import { useEffect, useState } from 'react'
import { useConfigurator } from '../store/useConfigurator'
import Icon from './icons'

/**
 * "Wyczyść" – powrót do pustej kopuły (bez paneli, dekoracji, wyposażenia i elementów).
 * Dwuetapowe potwierdzenie w samym panelu + możliwość cofnięcia (UndoToast).
 */
export function ResetButton() {
  const [confirm, setConfirm] = useState(false)
  const { resetAll } = useConfigurator.getState()

  useEffect(() => {
    if (!confirm) return
    const t = setTimeout(() => setConfirm(false), 6000)
    return () => clearTimeout(t)
  }, [confirm])

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-wine-600 px-2.5 py-1.5 text-[0.8rem] text-gold-100/75 transition-colors hover:border-gold-600 hover:text-gold-100"
      >
        <Icon name="trash" size={15} />
        Wyczyść
      </button>
    )
  }
  return (
    <div role="alertdialog" aria-label="Potwierdź wyczyszczenie" className="mt-3 basis-full rounded-xl border border-gold-500/60 bg-wine-950/60 p-3.5">
      <p className="text-[0.88rem] leading-snug text-gold-100">
        Wyczyścić całą konfigurację i zacząć od pustej kopuły?
      </p>
      <p className="mt-1 text-[0.78rem] leading-snug text-gold-100/55">
        Usunięte zostaną panele, dekoracje konstrukcji, wyposażenie i elementy wnętrza. Wymiary wrócą do 6 m / 3V.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            resetAll()
            setConfirm(false)
          }}
          className="flex-1 rounded-lg bg-gold-gradient px-3 py-2 text-sm font-semibold text-wine-900"
        >
          Tak, wyczyść
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="flex-1 rounded-lg border border-wine-500 px-3 py-2 text-sm text-gold-100/85 hover:border-gold-600"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}

/** Komunikat po wyczyszczeniu z przyciskiem "Cofnij" (znika po 10 s) */
export function UndoToast() {
  const show = useConfigurator((s) => s.resetNotice)
  const { undo, dismissResetNotice } = useConfigurator.getState()
  useEffect(() => {
    if (!show) return
    const t = setTimeout(dismissResetNotice, 10000)
    return () => clearTimeout(t)
  }, [show, dismissResetNotice])
  if (!show) return null
  return (
    <div
      role="status"
      className="pointer-events-auto absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-wine-900/95 py-1.5 pr-1.5 pl-4 text-[0.84rem] whitespace-nowrap text-gold-100 shadow-lg ring-1 ring-gold-500/50 backdrop-blur-md sm:bottom-5"
    >
      Konfiguracja wyczyszczona
      <button type="button" onClick={undo} className="flex items-center gap-1 rounded-full bg-gold-gradient px-3 py-1 font-semibold text-wine-900">
        <Icon name="undo" size={14} />
        Cofnij
      </button>
    </div>
  )
}

/** Cofnij / Ponów (Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y) */
export function HistoryControls({ className = '' }) {
  const canUndo = useConfigurator((s) => s.past.length > 0)
  const canRedo = useConfigurator((s) => s.future.length > 0)
  const { undo, redo } = useConfigurator.getState()
  const btn =
    'grid size-9 place-items-center rounded-xl text-gold-200 transition-colors hover:bg-wine-700 disabled:cursor-not-allowed disabled:text-gold-100/25 disabled:hover:bg-transparent'
  return (
    <div role="group" aria-label="Historia zmian" className={`flex gap-0.5 rounded-2xl bg-wine-900/75 p-1 shadow-lg backdrop-blur-md ${className}`}>
      <button type="button" className={btn} onClick={undo} disabled={!canUndo} title="Cofnij (Ctrl+Z)" aria-label="Cofnij">
        <Icon name="undo" size={18} />
      </button>
      <button type="button" className={btn} onClick={redo} disabled={!canRedo} title="Ponów (Ctrl+Shift+Z)" aria-label="Ponów">
        <Icon name="redo" size={18} />
      </button>
    </div>
  )
}
