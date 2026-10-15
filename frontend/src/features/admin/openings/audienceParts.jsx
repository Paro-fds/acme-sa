import { useEffect, useId, useState } from 'react'
import { previewAudience } from '../../../api/openings.js'

const PICKED = 8
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Help({ id, children }) {
  return (
    <p id={id} className="text-sm text-help">
      {children}
    </p>
  )
}

function FieldError({ error }) {
  if (!error) return null
  return (
    <p className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text">
      <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">warning</span>
      {error}
    </p>
  )
}

/**
 * US-115 CA-01 : une ou plusieurs unités du référentiel, cherchées par leur nom ; chacune se retire d'un clic.
 * `value` : codes dans l'ordre choisi.
 */
export function UnitPicker({ units, value, onChange, error }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const byCode = Object.fromEntries(units.map((unit) => [unit.code, unit]))
  const matches = query.trim()
    ? units.filter((unit) => !value.includes(unit.code) && fold(unit.label).includes(fold(query.trim()))).slice(0, PICKED)
    : []

  function add(code) {
    onChange([...value, code])
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-heading">
        Visible seulement par les employés de…
      </label>
      <Help id={`${id}-help`}>
        Une ou plusieurs unités du référentiel. Une région ou une direction inclut toutes ses agences. Sans choix : toutes
        les unités.
      </Help>
      <div className={`flex flex-col gap-2 rounded-lg border p-2 ${error ? 'border-error-border bg-error-bg' : 'border-border-input bg-surface'}`}>
        {value.length > 0 && (
          <ul aria-label="Unités choisies" className="flex flex-wrap gap-2">
            {value.map((code) => {
              const unit = byCode[code]
              const label = unit?.label ?? code
              return (
                <li key={code} className="flex min-h-9 items-center gap-2 rounded-full bg-info-bg py-0.5 pr-1 pl-3 text-sm font-semibold text-primary">
                  {label}
                  {unit?.type_label && <span className="font-medium text-help">· {unit.type_label}</span>}
                  <button
                    type="button"
                    aria-label={`Retirer ${label}`}
                    onClick={() => onChange(value.filter((other) => other !== code))}
                    className="flex size-8 items-center justify-center rounded-full bg-surface text-primary hover:bg-canvas"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex items-center gap-2 px-2">
          <span className="material-symbols-outlined text-xl text-muted" aria-hidden="true">search</span>
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls={`${id}-options`}
            aria-autocomplete="list"
            aria-describedby={`${id}-help`}
            aria-invalid={Boolean(error)}
            autoComplete="off"
            value={query}
            placeholder="Ajouter une agence, une région…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (matches[0]) add(matches[0].code)
              }
            }}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-heading outline-none placeholder:text-muted"
          />
        </div>
      </div>
      {matches.length > 0 && (
        <ul id={`${id}-options`} role="listbox" aria-label="Unités proposées" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-1 shadow-card">
          {matches.map((unit) => (
            <li key={unit.code} className="flex">
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => add(unit.code)}
                className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-md px-3 text-left text-base text-heading hover:bg-canvas"
              >
                <span>{unit.label}</span>
                <span className="text-sm text-help">{unit.type_label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && <p className="text-sm text-help">Aucune autre unité ne correspond.</p>}
      <FieldError error={error} />
    </div>
  )
}

/** US-115 CA-02 : un ou plusieurs domaines ; un certificat validé dans l'un d'eux suffit. */
export function DomainChecks({ domains, value, onChange, error }) {
  const helpId = useId()
  function toggle(code) {
    onChange(value.includes(code) ? value.filter((other) => other !== code) : [...value, code])
  }
  return (
    <fieldset aria-describedby={helpId} className="flex flex-col gap-2">
      <legend className="text-base font-semibold text-heading">Domaines acceptés</legend>
      <Help id={helpId}>
        L’employé doit avoir un certificat <strong className="text-heading">validé par les RH</strong> dans l’un de ces
        domaines. Sans choix : tous les domaines.
      </Help>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => {
          const on = value.includes(domain.code)
          return (
            <label
              key={domain.code}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-base ${
                on ? 'border-primary bg-info-bg font-semibold text-heading' : 'border-border bg-surface text-heading'
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(domain.code)} className="size-5 accent-primary" />
              {domain.label}
            </label>
          )
        })}
      </div>
      <FieldError error={error} />
    </fieldset>
  )
}

/** US-115 CA-04 : l'aperçu se recalcule 300 ms après le dernier changement de critère. */
export function useAudience(criteria) {
  const key = JSON.stringify(criteria)
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      previewAudience(JSON.parse(key))
        .then((data) => active && setState({ data, error: null }))
        .catch((error) => active && setState({ data: null, error }))
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [key])
  return state
}

/** US-115 CA-04, CA-05 : combien d'employés verront le poste, ce que chaque critère écarte ; avertit si personne. */
export function AudiencePreview({ data, error }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-5">
      <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold tracking-wide text-help uppercase">
        <span className="material-symbols-outlined text-lg" aria-hidden="true">group</span>
        Aperçu de l’audience
      </h2>
      {error ? (
        <p className="text-sm text-help">Aperçu indisponible : {error.message}</p>
      ) : !data ? (
        <p role="status" className="text-sm text-help">Calcul…</p>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2" aria-live="polite">
            <span className="text-5xl leading-none font-bold text-primary tabular-nums">{data.visible}</span>{' '}
            <span className="text-lg font-semibold text-heading">
              {data.visible > 1 ? 'employés verront ce poste' : data.visible === 1 ? 'employé verra ce poste' : 'employé ne verra ce poste'}
            </span>
          </p>
          <ul className="flex flex-col text-sm">
            <li className="flex items-baseline gap-3 border-t border-border py-2">
              <span className="min-w-12 text-right font-bold text-heading tabular-nums">{data.base}</span>{' '}
              <span className="text-help">{data.base_label}</span>
            </li>
            {data.steps.map((step) => (
              <li key={step.reason} className="flex items-baseline gap-3 border-t border-border py-2">
                <span className="min-w-12 text-right font-bold text-help tabular-nums">− {step.excluded}</span>{' '}
                <span className="text-help">{step.reason}</span>
              </li>
            ))}
          </ul>
          {data.visible === 0 && (
            <div role="status" className="flex items-start gap-2.5 rounded-lg bg-status-progress-bg p-3 text-status-progress-text">
              <span className="material-symbols-outlined shrink-0" aria-hidden="true">warning</span>
              <div className="flex flex-col gap-0.5">
                <p className="font-bold">Personne ne verra ce poste</p>
                <p className="text-sm text-heading">
                  Aucun employé ne remplit tous ces critères. Élargissez les unités ou les domaines ; vous pouvez tout de
                  même enregistrer.
                </p>
              </div>
            </div>
          )}
          <p className="text-sm text-help">
            Mis à jour à chaque changement de critère. Seules les données validées comptent : un certificat en cours
            d’examen ne compte pas.
          </p>
        </>
      )}
    </section>
  )
}
