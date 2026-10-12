import { useId, useState } from 'react'
import { Link } from 'react-router'
import { applyToOpening, listMyApplications, listMyOpenings, sendCv, withdrawApplication } from '../../api/openings.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import CareerTimeline from '../career/CareerTimeline.jsx'
import { formatDate, formatLocalDate } from '../../lib/format.js'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

const STEP_COUNT = 7

async function load() {
  const [openings, applications] = await Promise.all([listMyOpenings(), listMyApplications()])
  return { openings: openings.items, applications: applications.items }
}

/** US-902 : postuler, avec un message et un CV facultatifs ; l'accusé de réception est immédiat. */
function ApplyForm({ opening, onApplied, onCancel }) {
  const id = useId()
  const cvId = useId()
  const redirect = useUnauthorizedRedirect()
  const [motivation, setMotivation] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      const cv = cvFile ? await sendCv(cvFile) : null
      onApplied(await applyToOpening(opening.id, motivation, cv))
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-lg bg-section p-3">
      <label htmlFor={id} className="text-base font-semibold text-heading">
        Votre message aux RH (facultatif)
      </label>
      <textarea
        id={id}
        rows={4}
        value={motivation}
        onChange={(event) => setMotivation(event.target.value)}
        aria-invalid={error?.field === 'motivation'}
        className="w-full rounded-lg border border-border-input bg-surface px-4 py-3 text-base text-heading shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={cvId} className="text-base font-semibold text-heading">
          Votre CV (facultatif)
        </label>
        <p id={`${cvId}-help`} className="text-sm text-help">
          PDF, JPG ou PNG. Les RH le verront avec votre candidature.
        </p>
        <input
          id={cvId}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          aria-describedby={`${cvId}-help`}
          onChange={(event) => setCvFile(event.target.files[0] ?? null)}
          className="min-h-12 w-full rounded-lg border border-border-input bg-surface p-2 text-base text-heading file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-info-bg file:px-4 file:font-semibold file:text-primary"
        />
      </div>
      {error && <Alert>{error.message}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="rounded-xl sm:w-auto" disabled={sending}>
          <span className="material-symbols-outlined" aria-hidden="true">send</span>
          {sending ? 'Envoi…' : 'Envoyer ma candidature'}
        </Button>
        <Button variant="subtle" className="sm:w-auto" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

function OpeningCard({ opening, application, onApplied }) {
  const titleId = `opening-${opening.id}`
  const [applying, setApplying] = useState(false)
  return (
    <li>
      <article aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-status-done-bg px-2.5 py-0.5 text-sm font-semibold text-status-done-text">
            <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
            Vous remplissez les critères de ce poste
          </span>
          <h3 id={titleId} className="text-lg font-bold break-words text-primary-active">
            {opening.title}
          </h3>
          <p className="text-sm text-help">
            {opening.unit_label} · grade {opening.target_grade}
          </p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-heading">
            <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">event</span>
            Candidatures jusqu’au {formatDate(opening.closes_on)}
          </p>
        </div>
        <p className="text-base whitespace-pre-line text-body">{opening.mission}</p>
        {opening.criteria_lines.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg bg-section p-3">
            <p className="text-sm font-semibold text-heading">Critères du poste</p>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-help">
              {opening.criteria_lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {application ? (
          <p className="flex items-center gap-2 rounded-lg bg-info-bg p-3 text-base text-info-text">
            <span className="material-symbols-outlined shrink-0" aria-hidden="true">mark_email_read</span>
            Candidature envoyée le {formatLocalDate(application.received_at)} · N° {application.reference}
          </p>
        ) : applying ? (
          <ApplyForm opening={opening} onApplied={onApplied} onCancel={() => setApplying(false)} />
        ) : (
          <Button className="rounded-xl sm:w-auto sm:self-start" onClick={() => setApplying(true)}>
            Postuler
          </Button>
        )}
      </article>
    </li>
  )
}

function ApplicationItem({ application, onWithdrawn }) {
  const titleId = `application-${application.id}`
  const redirect = useUnauthorizedRedirect()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const closed = application.step === 'CLOSED'

  async function withdraw() {
    setSending(true)
    setError(null)
    try {
      await withdrawApplication(application.id)
      onWithdrawn()
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
      setSending(false)
    }
  }

  return (
    <li aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-0.5">
        <h3 id={titleId} className="text-lg font-bold break-words text-primary-active">
          {application.opening_title}
        </h3>
        <p className="text-sm text-help">
          N° {application.reference} · reçue le {formatLocalDate(application.received_at)}
        </p>
        {application.cv && <p className="text-sm text-help">CV joint : {application.cv.name}</p>}
      </div>
      <p className="rounded-lg bg-highlight p-3 text-base font-semibold text-primary-active">
        {closed
          ? `${application.step_label} · ${application.outcome_label}`
          : `Étape ${application.step_number} sur ${STEP_COUNT} : ${application.step_label}`}
      </p>
      <ol aria-label="Étapes" className="flex flex-col gap-1.5">
        {application.history.map((change, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-help">
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {change.step_label}
            {change.outcome_label ? ` (${change.outcome_label})` : ''} — {formatLocalDate(change.at)}
          </li>
        ))}
      </ol>
      {error && <Alert>{error.message}</Alert>}
      {application.can_withdraw &&
        (confirming ? (
          <div className="flex flex-col gap-2 rounded-lg bg-section p-3">
            <p className="text-base text-heading">Retirer cette candidature ? Elle restera dans votre historique.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="sm:w-auto" disabled={sending} onClick={withdraw}>
                Oui, retirer
              </Button>
              <Button variant="subtle" className="sm:w-auto" onClick={() => setConfirming(false)}>
                Non, la garder
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="subtle" className="sm:w-auto sm:self-start" onClick={() => setConfirming(true)}>
            Retirer ma candidature
          </Button>
        ))}
    </li>
  )
}

/**
 * US-801, US-902 (choix du 2026-10-11) : « Ma carrière » montre les postes publiés auxquels l'employé est apte,
 * lui permet d'y postuler et de suivre ses candidatures dans le circuit des RH.
 * US-114 : la frise du parcours vient en premier ; postes et candidatures à droite sur ordinateur, dessous sur téléphone.
 */
export default function MyOpeningsPage() {
  const { data, loading, error, reload } = useLoader(load)
  const [received, setReceived] = useState(null)
  const desktop = useIsDesktop()
  const active = (openingId) =>
    data?.applications.find((application) => application.opening_id === openingId && application.step !== 'CLOSED')

  function applied(application) {
    setReceived(application)
    reload()
  }

  const tip = (
    <Tip title="Ce qui compte">
      Chaque certificat validé peut vous ouvrir de nouveaux postes. Déposez-les dans{' '}
      <Link to="/certificats" className="font-semibold text-primary underline underline-offset-2">
        Mes certificats
      </Link>
      .
    </Tip>
  )

  const opportunities = (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-primary-active">Postes ouverts pour vous</h2>
        <p className="text-sm text-help">
          Les postes publiés par les RH dont vous remplissez les critères, d’après vos certificats validés, votre
          ancienneté, votre grade et votre unité.
        </p>
      </div>
      {loading && !data && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {received && (
        <Alert tone="success" title={`Candidature reçue le ${formatLocalDate(received.received_at)}`}>
          Votre numéro de suivi : {received.reference}. Suivez son avancement dans « Mes candidatures ».
        </Alert>
      )}
      {data && data.openings.length > 0 && (
        <ul aria-label="Postes ouverts pour vous" className="flex flex-col gap-4">
          {data.openings.map((opening) => (
            <OpeningCard key={opening.id} opening={opening} application={active(opening.id)} onApplied={applied} />
          ))}
        </ul>
      )}
      {data && data.openings.length === 0 && (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl bg-surface p-4 text-base text-heading shadow-card">
            Aucun poste ouvert ne correspond à votre profil pour le moment.
          </p>
          {tip}
        </div>
      )}
      {data && data.applications.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-primary-active">Mes candidatures</h2>
          <ul aria-label="Mes candidatures" className="flex flex-col gap-4">
            {data.applications.map((application) => (
              <ApplicationItem key={application.id} application={application} onWithdrawn={reload} />
            ))}
          </ul>
        </section>
      )}
    </>
  )

  return (
    <Page account wide title="Ma carrière">
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] leading-[34px] font-bold tracking-tight text-primary-active">Ma carrière</h2>
        <p className="text-help">Votre parcours, de vos études à aujourd’hui, et les postes ouverts pour vous.</p>
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <CareerTimeline />
        </div>
        {desktop ? (
          <aside aria-label="Postes et candidatures" className="flex flex-col gap-4">
            {opportunities}
          </aside>
        ) : (
          <div className="flex flex-col gap-4">{opportunities}</div>
        )}
      </div>
    </Page>
  )
}
