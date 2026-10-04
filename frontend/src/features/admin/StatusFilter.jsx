export const STATUSES = ['UPDATED', 'NOT_UPDATED']

const CHIPS = [
  { value: '', label: 'Tous', count: 'all' },
  { value: 'UPDATED', label: 'Effectuée', count: 'updated', dot: 'bg-status-done-dot' },
  { value: 'NOT_UPDATED', label: 'Non effectuée', count: 'not_updated', dot: 'bg-status-neutral-dot' },
]

/** Lit `?status=` ; une valeur inconnue revient à « Tous ». */
export function readStatus(searchParams) {
  const status = searchParams.get('status') ?? ''
  return STATUSES.includes(status) ? status : ''
}

/**
 * US-19 : puces « Tous / Effectuée / Non effectuée » avec leur nombre (selon la recherche en cours).
 * Deux statuts seulement côté admin : jamais de brouillon.
 */
export default function StatusFilter({ value, counts, onChange }) {
  return (
    <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const selected = value === chip.value
        return (
          <button
            key={chip.value || 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => !selected && onChange(chip.value)}
            className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-border-input bg-surface text-heading hover:border-primary'
            }`}
          >
            {chip.dot && <span className={`size-2 rounded-full ${chip.dot}`} aria-hidden="true" />}
            {chip.label}
            {counts && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-white/20' : 'bg-status-neutral-bg text-help'}`}
              >
                {counts[chip.count]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
