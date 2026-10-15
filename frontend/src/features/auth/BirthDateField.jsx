import { useId, useRef, useState } from 'react'

const PARTS = [
  { key: 'day', label: 'Jour', placeholder: 'JJ', length: 2 },
  { key: 'month', label: 'Mois', placeholder: 'MM', length: 2 },
  { key: 'year', label: 'Année', placeholder: 'AAAA', length: 4 },
]

function fromValue(value) {
  const [year = '', month = '', day = ''] = value ? value.split('-') : []
  return { day, month, year }
}

/** AAAA-MM-JJ pour une date réelle et complète (pas de 31 février), sinon une chaîne vide. */
function toValue({ day, month, year }) {
  if (year.length !== 4 || !month || !day) return ''
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : ''
}

/**
 * US-110 CA-04 : la date de naissance en trois cases Jour / Mois / Année, au clavier numérique.
 * `value` et `onChange` au format du serveur (AAAA-MM-JJ, vide tant que la date n'est pas complète et réelle).
 */
export default function BirthDateField({ value, onChange }) {
  const legendId = useId()
  const idPrefix = useId()
  const [parts, setParts] = useState(() => fromValue(value))
  const refs = useRef({})

  function update(part, raw) {
    const digits = raw.replace(/\D/g, '').slice(0, part.length)
    const next = { ...parts, [part.key]: digits }
    setParts(next)
    onChange(toValue(next))
    const following = PARTS[PARTS.indexOf(part) + 1]
    if (following && digits.length === part.length) refs.current[following.key]?.focus()
  }

  return (
    <fieldset aria-labelledby={legendId} className="flex flex-col gap-2">
      <legend id={legendId} className="mb-1 font-semibold text-heading">
        Date de naissance
      </legend>
      <div className="grid grid-cols-3 gap-3">
        {PARTS.map((part) => (
          <div key={part.key} className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-${part.key}`} className="text-sm text-help">
              {part.label}
            </label>
            <input
              ref={(element) => (refs.current[part.key] = element)}
              id={`${idPrefix}-${part.key}`}
              inputMode="numeric"
              autoComplete={`bday-${part.key}`}
              placeholder={part.placeholder}
              maxLength={part.length}
              value={parts[part.key]}
              onChange={(event) => update(part, event.target.value)}
              className="min-h-12 w-full rounded-lg border-[1.5px] border-border-input bg-surface px-3 text-center text-base text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        ))}
      </div>
    </fieldset>
  )
}
