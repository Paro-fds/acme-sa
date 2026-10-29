import { formatToday } from '../lib/format.js'

/**
 * US-127 : barre du haut blanche des deux espaces : `start` (bouton du menu sur téléphone), la date du jour,
 * puis à droite `children` (cloche, menu du compte). Elle reste en haut quand la page défile.
 */
export default function TopBar({ start, children }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-18 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {start}
        <span className="hidden truncate text-base text-help sm:inline">{formatToday()}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">{children}</div>
    </header>
  )
}
