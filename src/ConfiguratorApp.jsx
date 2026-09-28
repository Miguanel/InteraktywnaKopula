import { lazy, Suspense, useState } from 'react'
import UIOverlay from './ui/UIOverlay'
import ViewerOverlay from './ui/ViewerOverlay'
import InquiryModal from './ui/InquiryModal'

// Scena 3D (three.js ~600 kB) ładowana osobnym chunkiem – panel UI pojawia się od razu.
const DomeScene = lazy(() => import('./scene/DomeScene'))

/**
 * CONFIGURATOR APP – główny layout.
 *  • ≥ lg: podgląd 3D na całej wysokości + panel 420 px po prawej
 *  • < lg: podgląd u góry (~48% wysokości), panel przewijany pod spodem
 * Aplikacja zawsze wypełnia 100% swojego okna (dvh) – idealne do osadzenia w iframe.
 */
export default function ConfiguratorApp() {
  const [quoteOpen, setQuoteOpen] = useState(false)

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-wine-950 lg:flex-row">
      <main className="relative h-[48dvh] min-h-[280px] shrink-0 lg:h-full lg:min-h-0 lg:flex-1">
        <Suspense fallback={<SceneLoader />}>
          <DomeScene />
        </Suspense>
        <ViewerOverlay />
      </main>

      <aside
        aria-label="Opcje konfiguracji"
        className="panel-bg scrollbar-thin relative flex-1 overflow-y-auto overscroll-contain border-t border-gold-600/40 lg:w-[420px] lg:flex-none lg:border-t-0 lg:border-l xl:w-[440px]"
      >
        <UIOverlay onRequestQuote={() => setQuoteOpen(true)} />
      </aside>

      <InquiryModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  )
}

function SceneLoader() {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-wine-900 to-wine-950">
      <div className="flex flex-col items-center gap-3 text-gold-300">
        <span className="size-10 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400" />
        <span className="font-serif text-sm">Ładowanie modelu 3D…</span>
      </div>
    </div>
  )
}
