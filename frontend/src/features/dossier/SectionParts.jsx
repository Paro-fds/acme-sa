import { useId } from 'react'
import StatusBadge from '../../components/StatusBadge.jsx'

/**
 * En-tête d'une section du profil (écrans validés 07 → 09) : pastille « Section n / 3 », titre (avec `icon`
 * facultative, écran 07) et phrase d'accroche.
 */
export function SectionHeading({ number, title, icon, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-sm font-semibold text-primary-active">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        Section {number} / 3
      </span>
      <h2 className="flex items-center gap-2 text-[26px] leading-[34px] font-bold tracking-tight text-balance text-primary-active">
        {title}
        {icon && (
          <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">
            {icon}
          </span>
        )}
      </h2>
      <p className="text-sm leading-relaxed text-help">{children}</p>
    </div>
  )
}

/**
 * « Progression du dossier » (écran validé 08) : X %, la barre, « N sur 8 éléments complétés » et, si `section`
 * est donné, « Section n sur 3 · nom » (US-201).
 */
export function DossierProgress({ completion, section }) {
  const titleId = useId()
  const { percent, complete, total } = completion
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="flex items-center gap-1.5 text-sm font-semibold text-heading">
          <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">trending_up</span>
          Progression du dossier
        </h3>
        <span className="text-lg font-bold text-primary tabular-nums">{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progression du dossier"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 w-full overflow-hidden rounded-full bg-info-bg"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="flex flex-wrap items-center justify-between gap-x-3 text-sm text-help">
        <span>
          {complete} sur {total} éléments complétés
        </span>
        {section && <span>{section}</span>}
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
