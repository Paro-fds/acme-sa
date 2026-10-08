import { isDemo } from '../lib/env.js'

/** US-001 CA-04 : sur chaque écran hors production, on rappelle que les données sont fictives. */
export default function DemoBanner() {
  if (!isDemo()) return null
  return (
    <p
      role="note"
      className="flex items-center justify-center gap-1 bg-status-progress-bg px-4 py-1 text-center text-sm font-medium text-status-progress-text"
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">science</span>
      Démonstration · données fictives
    </p>
  )
}
