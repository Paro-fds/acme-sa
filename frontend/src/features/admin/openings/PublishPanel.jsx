import { useId, useState } from 'react'
import Button from '../../../components/Button.jsx'

const MISSING = 'Joignez la lettre du directeur RH pour publier ce poste.'

/**
 * US-124 : publier un brouillon. L'Agent RH joint la lettre du directeur RH (obligatoire) ;
 * l'Administrateur peut s'en passer. La lettre ne se change plus après la publication.
 */
export default function PublishPanel({ letterRequired, sending, error, onPublish }) {
  const id = useId()
  const [file, setFile] = useState(null)
  const [missing, setMissing] = useState(false)
  const fieldError = missing ? MISSING : error?.field === 'letter' ? error.message : null

  function handleSubmit(event) {
    event.preventDefault()
    if (letterRequired && !file) {
      setMissing(true)
      return
    }
    onPublish(file)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Publier le poste"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-base font-semibold text-heading">
          {letterRequired ? 'Lettre du directeur RH' : 'Lettre du directeur RH (facultative)'}
        </label>
        <p id={`${id}-help`} className="text-sm text-help">
          PDF, JPG ou PNG, 5 Mo au plus. Elle ne se change plus après la publication.
        </p>
        <input
          id={id}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={[`${id}-help`, fieldError && `${id}-error`].filter(Boolean).join(' ')}
          onChange={(event) => {
            setFile(event.target.files[0] ?? null)
            setMissing(false)
          }}
          className={`min-h-12 w-full rounded-lg border p-2 text-base text-heading file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-info-bg file:px-4 file:font-semibold file:text-primary ${
            fieldError ? 'border-error-border bg-error-bg' : 'border-border-input bg-surface'
          }`}
        />
        {fieldError && (
          <p
            id={`${id}-error`}
            className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text"
          >
            <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">
              error
            </span>
            {fieldError}
          </p>
        )}
      </div>
      <Button type="submit" className="sm:w-auto sm:self-start" disabled={sending}>
        {sending ? 'Publication…' : 'Publier'}
      </Button>
    </form>
  )
}
