import { useId } from 'react'

/** Champ de saisie du design system ; `trailing` affiche un bouton à droite du champ. */
export default function TextField({ label, error, help, trailing, className = '', ...inputProps }) {
  const id = useId()
  const describedBy = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-base font-semibold text-heading">
        {label}
      </label>
      {help && (
        <p id={`${id}-help`} className="text-sm text-help">
          {help}
        </p>
      )}
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-lg border-[1.5px] bg-surface px-4 text-base text-heading outline-none focus:border-2 focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_37_87/0.15)] ${
            error ? 'border-error-border bg-error-bg' : 'border-border-input'
          } ${trailing ? 'pr-14' : ''}`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-sm text-error-text">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  )
}
