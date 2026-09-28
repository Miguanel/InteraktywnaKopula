import { useEffect, useRef, useState } from 'react'
import { useConfigurator, getShareUrl } from '../store/useConfigurator'
import { describeConfig } from '../lib/specs'
import Icon from './icons'

const ENDPOINT = import.meta.env.VITE_INQUIRY_ENDPOINT || ''
const EMAIL = import.meta.env.VITE_INQUIRY_EMAIL || ''

/**
 * Formularz zapytania ofertowego.
 *  • VITE_INQUIRY_ENDPOINT → POST JSON (np. Formspree, własne API),
 *  • w przeciwnym razie → otwiera klienta poczty (mailto:) z gotową treścią,
 *  • zawsze → window.parent.postMessage({ type: 'domedron:inquiry', … })
 *    – strona klienta osadzająca iframe może przechwycić zgłoszenie (np. do GA / CRM).
 */
export default function InquiryModal({ open, onClose }) {
  const config = useConfigurator((s) => s.config)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const dialog = useRef()

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      setStatus('idle')
      d.showModal()
    }
    if (!open && d.open) d.close()
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const contact = Object.fromEntries(form.entries())
    const { text, rows } = describeConfig(config)
    const shareUrl = getShareUrl(config)
    const payload = {
      contact,
      configuration: config,
      summary: Object.fromEntries(rows),
      summaryText: text,
      shareUrl,
      createdAt: new Date().toISOString(),
    }

    try {
      window.parent?.postMessage({ type: 'domedron:inquiry', payload }, '*')
    } catch {
      /* brak rodzica – ignorujemy */
    }

    if (ENDPOINT) {
      setStatus('sending')
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(String(res.status))
        setStatus('sent')
      } catch {
        setStatus('error')
      }
      return
    }

    // Fallback: wiadomość e-mail
    const body = [
      `Imię i nazwisko: ${contact.name}`,
      `E-mail: ${contact.email}`,
      contact.phone ? `Telefon: ${contact.phone}` : null,
      contact.location ? `Lokalizacja inwestycji: ${contact.location}` : null,
      '',
      contact.message || '',
      '',
      text,
      '',
      `Podgląd konfiguracji: ${shareUrl}`,
    ]
      .filter((l) => l !== null)
      .join('\n')
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent('Zapytanie ofertowe – kopuła Domedron')}&body=${encodeURIComponent(body)}`
    window.location.href = href
    setStatus('sent')
  }

  const { rows } = describeConfig(config)

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto w-[min(640px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-2xl border border-wine-600 bg-transparent p-0 text-gold-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="panel-bg flex max-h-[calc(100dvh-24px)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-wine-700 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-serif text-2xl text-gold-gradient">Zapytanie ofertowe</h2>
            <p className="mt-0.5 text-sm text-gold-100/60">Twoja konfiguracja zostanie dołączona automatycznie.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij" className="grid size-9 shrink-0 place-items-center rounded-lg text-gold-200 hover:bg-wine-700">
            <Icon name="close" />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-gradient text-wine-900">
              <Icon name="check" size={28} />
            </span>
            <h3 className="mt-4 font-serif text-2xl text-gold-200">Dziękujemy!</h3>
            <p className="mx-auto mt-2 max-w-sm text-gold-100/70">
              {ENDPOINT
                ? 'Zapytanie dotarło do nas. Skontaktujemy się, aby omówić szczegóły i przygotować ofertę.'
                : 'Otworzyliśmy Twój program pocztowy z gotową wiadomością – wystarczy ją wysłać.'}
            </p>
            <button type="button" onClick={onClose} className="mt-6 rounded-xl border border-gold-500/60 px-5 py-2.5 text-gold-200 hover:bg-wine-700">
              Wróć do konfiguratora
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="scrollbar-thin grid gap-4 overflow-y-auto px-5 py-5 sm:px-6">
            <details className="rounded-xl border border-wine-600/70 bg-wine-950/40 px-4 py-3 text-sm">
              <summary className="cursor-pointer text-gold-300 select-none">Twoja konfiguracja ({rows.length} pozycji)</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-gold-100/55">{k}</dt>
                    <dd className="text-gold-100">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Imię i nazwisko" name="name" autoComplete="name" required />
              <Field label="E-mail" name="email" type="email" autoComplete="email" required />
              <Field label="Telefon" name="phone" type="tel" autoComplete="tel" />
              <Field label="Lokalizacja inwestycji" name="location" placeholder="np. Bieszczady" />
            </div>
            <Field label="Wiadomość" name="message" textarea placeholder="Planowany termin, przeznaczenie, pytania…" />

            <label className="flex items-start gap-2.5 text-[0.8rem] leading-snug text-gold-100/60">
              <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-gold-500" />
              Wyrażam zgodę na przetwarzanie moich danych w celu przygotowania oferty i kontaktu w sprawie zapytania.
            </label>

            {status === 'error' && (
              <p role="alert" className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-100">
                Nie udało się wysłać zapytania. Spróbuj ponownie za chwilę.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-5 py-3.5 font-serif text-lg font-semibold text-wine-900 transition-opacity disabled:opacity-60"
            >
              {status === 'sending' ? 'Wysyłanie…' : 'Wyślij zapytanie'}
              <Icon name="send" size={18} />
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}

function Field({ label, name, textarea, ...props }) {
  const cls =
    'mt-1 w-full rounded-lg border border-wine-600 bg-wine-950/60 px-3 py-2.5 text-gold-100 placeholder:text-gold-100/30 transition-colors focus:border-gold-500 focus:outline-none'
  return (
    <label className="block text-sm text-gold-100/70">
      {label}
      {props.required && <span className="text-gold-400"> *</span>}
      {textarea ? <textarea name={name} rows={3} className={cls} {...props} /> : <input name={name} className={cls} {...props} />}
    </label>
  )
}
