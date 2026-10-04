import TextField from '../../components/TextField.jsx'
import { displayValue } from '../../lib/format.js'

const INPUT_TYPES = { telephone_number: 'tel', email_address: 'email' }
const AUTOCOMPLETE = {
  last_name: 'family-name',
  first_name: 'given-name',
  telephone_number: 'tel',
  email_address: 'email',
  address_line_1: 'street-address',
}

function ModifiedBadge({ modified }) {
  return modified ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-xs font-semibold text-info-text">
      <span className="size-1.5 rounded-full bg-info-text" aria-hidden="true" />
      Modifié
    </span>
  ) : (
    <span className="text-xs font-semibold text-muted">Inchangé</span>
  )
}

/** US-09 : un champ modifiable, avec badge « Modifié » et ancienne valeur barrée. */
export default function FieldCard({ field, value, modified, error, onChange, onBlur }) {
  return (
    <div data-field={field.code} className={`rounded-xl p-3 ${modified ? 'bg-section' : ''}`}>
      <TextField
        label={field.label}
        type={INPUT_TYPES[field.code] ?? 'text'}
        autoComplete={AUTOCOMPLETE[field.code]}
        required={field.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
        labelAside={<ModifiedBadge modified={modified} />}
        footer={
          modified && (
            <p className="flex items-start gap-1.5 text-sm text-help">
              <span className="material-symbols-outlined text-[16px] text-muted" aria-hidden="true">history</span>
              <span>
                Ancienne valeur :{' '}
                {field.original_value ? (
                  <s className="text-muted">{field.original_value}</s>
                ) : (
                  <span className="text-muted italic">{displayValue('')}</span>
                )}
              </span>
            </p>
          )
        }
      />
    </div>
  )
}
