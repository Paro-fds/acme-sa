import { useId } from 'react'
import { displayValue } from '../../lib/format.js'

function EditableMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-info-text">
      Modifiable
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
    </span>
  )
}

function LockedMark() {
  return (
    <span role="img" aria-label="Non modifiable" className="material-symbols-outlined shrink-0 text-[18px] text-muted">
      lock
    </span>
  )
}

/**
 * Section du profil (US-05) : en-tête teinté avec icône, puis une liste « libellé / valeur ».
 * `fields` : [{ label, value, editable }] ; chaque champ indique s'il est modifiable.
 */
export default function InfoSection({ icon, title, fields }) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 bg-section px-4 py-3">
        <span className="material-symbols-outlined text-[20px] text-info-text" aria-hidden="true">{icon}</span>
        <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
      </div>
      <dl className="divide-y divide-border px-4">
        {fields.map(({ label, value, editable }) => (
          <div key={label} className="flex flex-col py-3">
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="flex items-start justify-between gap-3">
              <span className={`min-w-0 break-words ${value ? 'text-heading' : 'text-muted italic'}`}>
                {displayValue(value)}
              </span>
              {editable ? <EditableMark /> : <LockedMark />}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
