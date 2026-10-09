import { useId, useRef, useState } from 'react'
import { getReferential, importReferential } from '../../../api/referential.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'
import { formatDate } from '../../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../../lib/useLoader.js'
import Block from '../Block.jsx'

const LOGIN_PATH = '/admin/connexion'

/** Les deux onglets attendus dans le classeur (US-501 CA-01). */
const SHEETS = [
  {
    name: 'Unités',
    columns: 'Code · Libellé officiel · Type (Agence, Région, Direction, Service, Siège) · Rattachée à · Rattachée depuis (JJ/MM/AAAA) · Anciens libellés (séparés par ;)',
  },
  {
    name: 'Correspondances',
    columns: "Colonne de l'export (agency_code, department) · Valeur dans l'export · Code de l'unité (vide = « À rattacher »)",
  },
]

function ImportSummary({ summary }) {
  const counts = Object.entries(summary.counts)
    .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
    .join(', ')
  return (
    <div role="status" className="flex flex-col gap-1 rounded-lg border border-status-done-border bg-status-done-bg p-3 text-status-done-text">
      <p className="font-semibold">Référentiel importé : {counts}.</p>
      <p>
        {summary.added} unité{summary.added > 1 ? 's' : ''} ajoutée{summary.added > 1 ? 's' : ''} ; {summary.mappings} correspondance
        {summary.mappings > 1 ? 's' : ''}, dont {summary.unmapped} à rattacher.
      </p>
      {summary.renamed.map((line) => (
        <p key={line}>Renommée : {line}</p>
      ))}
      {summary.moved.map((line) => (
        <p key={line}>Changement de rattachement : {line}</p>
      ))}
    </div>
  )
}

function Problems({ error }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-error-border bg-error-bg p-3 text-error-text">
      <p className="font-semibold">{error.message}</p>
      {error.details?.problems?.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {error.details.problems.map((problem) => (
            <li key={`${problem.sheet}-${problem.line}-${problem.message}`}>
              {problem.sheet}
              {problem.line ? `, ligne ${problem.line}` : ''} : {problem.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** CA-01 : l'administrateur importe le classeur de la responsable du référentiel. */
function ImportForm({ onImported }) {
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)
  const inputRef = useRef(null)
  const inputId = useId()
  const [file, setFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file || sending) return
    setSending(true)
    setSummary(null)
    setError(null)
    try {
      setSummary(await importReferential(file))
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      onImported()
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError)
    }
    setSending(false)
  }

  return (
    <Block icon="upload_file" title="Importer le fichier du référentiel">
      <p>Le fichier décrit le référentiel complet. S'il contient une erreur, rien n'est importé et chaque problème est indiqué avec sa ligne.</p>
      <ul className="flex flex-col gap-2 text-sm text-help">
        {SHEETS.map((sheet) => (
          <li key={sheet.name}>
            <span className="font-semibold text-heading">Onglet « {sheet.name} »</span> : {sheet.columns}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-semibold text-heading">
            Classeur Excel (.xlsx)
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-12 rounded-lg border-[1.5px] border-border-input bg-surface p-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-info-bg file:px-3 file:py-2 file:font-semibold file:text-info-text"
          />
        </div>
        {summary && <ImportSummary summary={summary} />}
        {error && <Problems error={error} />}
        <Button type="submit" disabled={!file || sending}>
          <span className="material-symbols-outlined" aria-hidden="true">upload</span>
          {sending ? 'Import…' : 'Importer'}
        </Button>
      </form>
    </Block>
  )
}

function UnitLine({ unit }) {
  return (
    <li className="flex flex-col gap-0.5 border-t border-border py-2 first:border-t-0">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-heading">{unit.label}</span>
        <span className="font-mono text-sm text-help">{unit.code}</span>
      </p>
      {unit.since && (
        <p className="text-sm text-help">
          Rattachée depuis le {formatDate(unit.since)}
          {unit.history.length > 1 &&
            ` ; avant : ${unit.history
              .slice(0, -1)
              .map((a) => `${a.parent_code} jusqu'au ${formatDate(a.end)}`)
              .join(', ')}`}
        </p>
      )}
      {unit.former_labels.length > 0 && (
        <p className="text-sm text-help">Ancien libellé : {unit.former_labels.join(', ')}</p>
      )}
    </li>
  )
}

const COLUMN_LABELS = { agency_code: 'Agence', department: 'Direction ou service' }

/** US-502 : les valeurs de l'export sans unité officielle, avec le nombre d'employés concernés (RG-17). */
function ToAttach({ items }) {
  return (
    <Block icon="link_off" title="À rattacher">
      {items.length === 0 ? (
        <p>Toutes les valeurs de l'export sont rattachées à une unité officielle.</p>
      ) : (
        <>
          <p>
            Ces employés voient « Unité à confirmer », sans être bloqués. Ajoutez la correspondance dans le fichier du
            référentiel puis importez-le : la valeur disparaît de la liste.
          </p>
          <ul className="flex flex-col">
            {items.map((item) => (
              <li
                key={`${item.column}-${item.value}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border py-2 first:border-t-0"
              >
                <span>
                  <span className="font-semibold text-heading">{item.value}</span>{' '}
                  <span className="text-sm text-help">· {COLUMN_LABELS[item.column] ?? item.column}</span>
                </span>
                <span className="text-sm text-help tabular-nums">
                  {item.employees} employé{item.employees > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Block>
  )
}

/** Unités groupées par rattachement : chaque région avec ses agences, chaque direction avec ses services. */
function UnitTree({ units }) {
  const children = (code) => units.filter((unit) => unit.parent_code === code)
  const parents = units.filter((unit) => unit.type === 'REGION' || unit.type === 'DIRECTION')
  const others = units.filter((unit) => !unit.parent_code && unit.type !== 'REGION' && unit.type !== 'DIRECTION')
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {parents.map((parent) => (
        <section key={parent.code} aria-label={parent.label} className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <h4 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
            {parent.label} <span className="font-mono text-sm font-normal text-help">{parent.code}</span>
          </h4>
          <p className="text-sm text-help">{parent.type_label}</p>
          <ul className="mt-2">
            {children(parent.code).map((unit) => (
              <UnitLine key={unit.code} unit={unit} />
            ))}
          </ul>
        </section>
      ))}
      {others.length > 0 && (
        <section aria-label="Autres unités" className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <h4 className="text-lg font-semibold">Autres unités</h4>
          <ul className="mt-2">
            {others.map((unit) => (
              <UnitLine key={unit.code} unit={unit} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** US-501 : référentiel officiel des unités (lot 1 : import d'un fichier Excel, D-27 ; interface au lot 4). */
export default function ReferentialPage() {
  const { data, error, loading, reload } = useLoader(getReferential, { loginPath: LOGIN_PATH })
  const unitsId = useId()

  const page = (children) => (
    <Page account="admin" title="Référentiel" backTo="/admin" wide>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  const unmapped = data.mappings.filter((mapping) => !mapping.unit_code)
  return page(
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Référentiel des unités</h2>
        <p>
          Agences, régions, directions et services officiels. Chaque unité garde son code, même si elle change de nom ;
          une agence a une seule région à la fois.
        </p>
      </div>

      <ImportForm onImported={reload} />

      <ToAttach items={data.to_attach ?? []} />

      <section aria-labelledby={unitsId} className="flex flex-col gap-3">
        <h3 id={unitsId} className="px-1 text-lg font-semibold">
          {data.units.length === 0
            ? 'Aucune unité : importez le fichier du référentiel.'
            : `${data.units.length} unité${data.units.length > 1 ? 's' : ''}`}
        </h3>
        {data.units.length > 0 && <UnitTree units={data.units} />}
      </section>

      {data.mappings.length > 0 && (
        <Block icon="link" title="Correspondances avec l'export RH">
          <p>
            {data.mappings.length} valeur{data.mappings.length > 1 ? 's' : ''} de l'export, dont{' '}
            {data.mappings.length - unmapped.length} reliée{data.mappings.length - unmapped.length > 1 ? 's' : ''} à une unité.
          </p>
        </Block>
      )}
    </>,
  )
}
