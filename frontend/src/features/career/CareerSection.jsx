import { useId } from 'react'
import { Link } from 'react-router'
import Button from '../../components/Button.jsx'
import CareerEntryCard, { SkillTag } from './CareerEntryCard.jsx'
import { CAREER_KINDS } from './careerKinds.js'

const plural = (count) => `${count} élément${count > 1 ? 's' : ''}`

const ADD_CLASSES =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary px-5 font-semibold text-primary hover:bg-info-bg'

function AddButton({ kind, label, full, limit }) {
  const addLabel = `Ajouter : ${label}`
  if (full) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="secondary" disabled aria-label={addLabel}>
          <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
          Ajouter
        </Button>
        <p className="text-sm text-help">Nombre maximum d’éléments atteint pour cette rubrique ({limit}).</p>
      </div>
    )
  }
  return (
    <Link to={`/parcours/ajouter/${CAREER_KINDS[kind].slug}`} aria-label={addLabel} className={ADD_CLASSES}>
      <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
      Ajouter
    </Link>
  )
}

/** Une rubrique du parcours : titre, nombre d'éléments, liste (ou message d'accueil) et « Ajouter » (US-25). */
export default function CareerSection({ kind, label, count, limit, items }) {
  const titleId = useId()
  const { icon, empty } = CAREER_KINDS[kind]
  const isSkill = kind === 'SKILL'

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </span>
          <h3 id={titleId} className="text-lg font-semibold">{label}</h3>
        </div>
        <span className="shrink-0 text-sm whitespace-nowrap text-help">{plural(count)}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-help">{empty}</p>
      ) : (
        <ul className={isSkill ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}>
          {items.map((entry) => (isSkill ? <SkillTag key={entry.id} entry={entry} /> : <CareerEntryCard key={entry.id} entry={entry} />))}
        </ul>
      )}

      <AddButton kind={kind} label={label} full={count >= limit} limit={limit} />
    </section>
  )
}
