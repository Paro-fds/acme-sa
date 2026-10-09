import { useId } from 'react'
import StatusBadge from '../../components/StatusBadge.jsx'

/** En-tête d'une section du profil (maquettes 08, 09) : « Section n / 3 », titre et phrase d'accroche. */
export function SectionHeading({ number, title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit rounded-full bg-info-bg px-3 py-1 text-sm font-semibold text-info-text">Section {number} / 3</span>
      <h2 className="text-[26px] leading-8 font-bold text-balance">{title}</h2>
      <p>{children}</p>
    </div>
  )
}

/** « Progression du dossier » : X % et « N sur 8 éléments complétés » (US-201). */
export function DossierProgress({ completion }) {
  const titleId = useId()
  const { percent, complete, total } = completion
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={titleId} className="flex items-center gap-2 font-semibold text-heading">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">trending_up</span>
          Progression du dossier
        </h3>
        <span className="text-xl font-bold text-primary tabular-nums">{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progression du dossier"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 w-full overflow-hidden rounded-full bg-status-neutral-bg"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-help">
        {complete} sur {total} éléments complétés
      </p>
    </section>
  )
}

/**
 * État d'une information : « Complet » (saisie ou confirmée), « À confirmer » (valeur de l'export proposée),
 * « À compléter » (vide), « À corriger » (format refusé).
 */
export function FieldStatus({ complete, value, error }) {
  if (error) return <StatusBadge tone="error">À corriger</StatusBadge>
  if (complete) return <StatusBadge tone="done">Complet</StatusBadge>
  if (value) return <StatusBadge tone="progress">À confirmer</StatusBadge>
  return <StatusBadge tone="neutral">À compléter</StatusBadge>
}
