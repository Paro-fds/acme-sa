import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { changeOpeningStatus, getOpening, listOpeningApplications } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'
import { formatDate, formatLocalDate } from '../../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../../lib/useLoader.js'
import OpeningApplications from './OpeningApplications.jsx'
import { canEdit, isAdministrator, LOGIN_PATH, OPENINGS_PATH, OpeningStatusBadge } from './openingParts.jsx'

/** Changements de statut proposés à l'Administrateur, selon le statut actuel (CA-02). */
const ACTIONS = {
  DRAFT: [{ action: 'publish', label: 'Publier', done: 'Poste publié.' }],
  PUBLISHED: [
    { action: 'close', label: 'Clôturer', done: 'Poste clôturé.', variant: 'secondary' },
    { action: 'fill', label: 'Marquer pourvu', done: 'Poste marqué pourvu.', variant: 'secondary' },
  ],
  CLOSED: [{ action: 'fill', label: 'Marquer pourvu', done: 'Poste marqué pourvu.', variant: 'secondary' }],
  FILLED: [],
}

function Fact({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-help">{label}</dt>
      <dd className="text-base font-semibold break-words text-heading">{children}</dd>
    </div>
  )
}

function Section({ title, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-6">
      <h3 id={id} className="text-lg font-semibold text-heading">
        {title}
      </h3>
      {children}
    </section>
  )
}

function CriteriaChanges({ changes }) {
  if (changes.length === 0) return null
  return (
    <Section title="Critères modifiés après publication">
      <ul className="flex flex-col gap-3">
        {changes.map((change, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-lg bg-section p-3">
            <p className="text-sm font-semibold text-heading">
              {formatLocalDate(change.at)} · {change.actor_name}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-sm text-help">Avant</p>
                <ul className="text-sm text-heading">
                  {change.before.length ? change.before.map((line) => <li key={line}>{line}</li>) : <li>Aucun critère</li>}
                </ul>
              </div>
              <div>
                <p className="text-sm text-help">Après</p>
                <ul className="text-sm text-heading">
                  {change.after.length ? change.after.map((line) => <li key={line}>{line}</li>) : <li>Aucun critère</li>}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function OpeningDetail({ id, initial, me, applications }) {
  const redirect = useUnauthorizedRedirect(LOGIN_PATH)
  const [opening, setOpening] = useState(initial)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const editable = canEdit(me) && (opening.status === 'DRAFT' || opening.status === 'PUBLISHED')
  const actions = isAdministrator(me) ? ACTIONS[opening.status] : []

  async function change({ action, done }) {
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      setOpening(await changeOpeningStatus(id, action))
      setNotice(done)
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-help">{opening.code}</p>
          <h2 className="text-2xl font-bold tracking-tight break-words text-primary">{opening.title}</h2>
          <OpeningStatusBadge opening={opening} />
        </div>
        {editable && (
          <Link
            to={`${OPENINGS_PATH}/${id}/modifier`}
            className="flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-info-bg"
          >
            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
            Modifier
          </Link>
        )}
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error.message}</Alert>}
      {opening.status === 'DRAFT' && !isAdministrator(me) && (
        <p className="rounded-lg bg-info-bg p-3 text-base text-info-text">
          En attente de la validation d'un Administrateur, qui le publiera.
        </p>
      )}
      {actions.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {actions.map((item) => (
            <Button key={item.action} variant={item.variant} className="sm:w-auto" disabled={sending} onClick={() => change(item)}>
              {item.label}
            </Button>
          ))}
        </div>
      )}

      <Section title="Fiche du poste">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Fact label="Unité">{opening.unit_label}</Fact>
          <Fact label="Date d'ouverture">{formatDate(opening.opens_on)}</Fact>
          <Fact label="Date limite">{formatDate(opening.closes_on)}</Fact>
        </dl>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-help">Mission</p>
          <p className="text-base whitespace-pre-line text-heading">{opening.mission}</p>
        </div>
      </Section>

      <Section title="Critères">
        {opening.criteria_lines.length ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-heading">
            {opening.criteria_lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-help">Aucun critère : le poste est ouvert à tous les employés.</p>
        )}
      </Section>

      <Section title="Historique">
        <ol aria-label="Historique du statut" className="flex flex-col gap-2">
          {opening.history.map((step, index) => (
            <li key={index} className="flex items-center gap-2 text-base text-heading">
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <span className="font-semibold">{step.status_label}</span> — {formatLocalDate(step.at)} · {step.actor_name}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <CriteriaChanges changes={opening.criteria_changes} />

      {opening.status !== 'DRAFT' && <OpeningApplications applications={applications} canAct={canEdit(me)} />}
    </>
  )
}

/** US-802 : fiche d'un poste, son statut daté et signé, et les changements de statut de l'Administrateur. */
export default function OpeningDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = useLoader(
    async () => {
      const [opening, me, applications] = await Promise.all([getOpening(id), getAdminMe(), listOpeningApplications(id)])
      return { opening, me, applications: applications.items }
    },
    { loginPath: LOGIN_PATH, key: id },
  )

  return (
    <Page account="admin" backTo={OPENINGS_PATH} backLabel="Postes ouverts">
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {data && <OpeningDetail key={id} id={id} initial={data.opening} me={data.me} applications={data.applications} />}
    </Page>
  )
}
