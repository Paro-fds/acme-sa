import { useId } from 'react'

/**
 * Champ de saisie du design system (écrans validés 08, 09 : anneau bleu au focus, erreur orange et bienveillante).
 * `trailing` : bouton à droite du champ ; `required` : astérisque + « (obligatoire) » pour les lecteurs d'écran ;
 * `labelAside` : élément à droite du libellé (badge) ; `footer` : ligne d'information sous le champ ;
 * `icon` : icône Material à gauche du champ (écran 08).
 */
export default function TextField({
  label,
  error,
  help,
  trailing,
  required = false,
  labelAside,
  footer,
  icon,
  className = '',
  ...inputProps
}) {
  const id = useId()
  const describedBy = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <label htmlFor={id} className="text-base font-semibold text-heading">
            {label}
          </label>
          {required && (
            <>
              <span className="font-bold text-error-dot" aria-hidden="true">*</span>
              <span className="sr-only">(obligatoire)</span>
            </>
          )}
        </div>
        {labelAside}
      </div>
      {help && (
        <p id={`${id}-help`} className="text-sm text-help">
          {help}
        </p>
      )}
      <div className="relative">
        {icon && (
          <span
            className={`material-symbols-outlined pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[22px] ${
              error ? 'text-error-text' : 'text-muted'
            }`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-lg border px-4 text-base text-heading shadow-card outline-none placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${
            error ? 'border-error-border bg-error-bg' : 'border-border-input bg-surface'
          } ${icon ? 'pl-12' : ''} ${trailing ? 'pr-14' : ''}`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {footer}
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text"
        >
          <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">
            report_problem
          </span>
          {error}
        </p>
      )}
    </div>
  )
}
