import { useId } from 'react'
import StatusBadge from '../../../components/StatusBadge.jsx'

export const OPENINGS_PATH = '/admin/postes'
export const LOGIN_PATH = '/admin/connexion'

const TONES = { DRAFT: 'neutral', PUBLISHED: 'done', CLOSED: 'progress', FILLED: 'neutral' }

/** Statut du poste en pastille : toujours un texte, jamais la couleur seule. */
export function OpeningStatusBadge({ opening }) {
  return <StatusBadge tone={TONES[opening.status]}>{opening.status_label}</StatusBadge>
}

/** Saisie et modification : Agent RH ou Administrateur (US-802). */
export const canEdit = (me) => me?.role === 'ADMIN' || me?.role === 'AGENT_RH'
/** Publier, clôturer, pourvoir : Administrateur seul. */
export const isAdministrator = (me) => me?.role === 'ADMIN'

function Label({ htmlFor, label, required }) {
  return (
    <div className="flex items-baseline gap-1">
      <label htmlFor={htmlFor} className="text-base font-semibold text-heading">
        {label}
      </label>
      {required && (
        <>
          <span className="font-bold text-error-dot" aria-hidden="true">*</span>
          <span className="sr-only">(obligatoire)</span>
        </>
      )}
    </div>
  )
}

function FieldError({ id, error }) {
  if (!error) return null
  return (
    <p id={id} className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text">
      <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">warning</span>
      {error}
    </p>
  )
}

const CONTROL =
  'w-full rounded-lg border px-4 text-base text-heading shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/30'
const controlState = (error) => (error ? 'border-error-border bg-error-bg' : 'border-border-input bg-surface')

/** Liste déroulante avec libellé, aide et erreur affichée sous le champ. */
export function SelectField({ label, options, value, onChange, error, required = false, emptyLabel = 'Choisir…' }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} label={label} required={required} />
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 appearance-none pr-10 ${CONTROL} ${controlState(error)}`}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.type_label ? `${option.label} (${option.type_label})` : option.label}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl text-muted"
          aria-hidden="true"
        >
          keyboard_arrow_down
        </span>
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  )
}

export function TextAreaField({ label, value, onChange, error, help, required = false }) {
  const id = useId()
  const describedBy = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} label={label} required={required} />
      {help && (
        <p id={`${id}-help`} className="text-sm text-help">
          {help}
        </p>
      )}
      <textarea
        id={id}
        rows={5}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`py-3 ${CONTROL} ${controlState(error)}`}
      />
      <FieldError id={`${id}-error`} error={error} />
    </div>
  )
}
