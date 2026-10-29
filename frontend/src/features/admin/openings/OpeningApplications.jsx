import { useId, useState } from 'react'
import { applicationCvUrl, closeApplication, moveApplication } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import { formatLocalDate } from '../../../lib/format.js'
import { useUnauthorizedRedirect } from '../../../lib/useLoader.js'
import { LOGIN_PATH, SelectField } from './openingParts.jsx'

const OUTCOMES = [
  { code: 'ACCEPTED', label: 'Acceptée' },
  { code: 'REFUSED', label: 'Refusée' },
  { code: 'POSTPONED', label: 'Reportée' },
]

/** Étape suivante ou clôture : Agent RH ou Administrateur (US-902). */
function Actions({ application, onChanged }) {
  const redirect = useUnauthorizedRedirect(LOGIN_PATH)
  const [step, setStep] = useState(application.next_steps[0]?.code ?? '')
  const [outcome, setOutcome] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function run(call) {
    setSending(true)
    setError(null)
    try {
      onChanged(await call())
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-section p-3">
      {application.next_steps.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <SelectField label="Étape suivante" options={application.next_steps} value={step} onChange={(e) => setStep(e.target.value)} />
          </div>
          <Button className="sm:w-auto" disabled={!step || sending} onClick={() => run(() => moveApplication(application.id, step))}>
            Passer à l'étape
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <SelectField label="Suite donnée" options={OUTCOMES} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
        </div>
        <Button
          variant="secondary"
          className="sm:w-auto"
          disabled={!outcome || sending}
          onClick={() => run(() => closeApplication(application.id, outcome))}
        >
          Clôturer la candidature
        </Button>
      </div>
      {error && <Alert>{error.message}</Alert>}
    </div>
  )
}

function ApplicationItem({ application: initial, canAct }) {
  const nameId = useId()
  const [application, setApplication] = useState(initial)
  const closed = application.step === 'CLOSED'
  return (
    <li aria-labelledby={nameId} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-0.5">
        <p id={nameId} className="text-base font-semibold text-heading">
          {application.employee_name} <span className="font-normal text-help">· {application.employee_code}</span>
        </p>
        <p className="text-sm text-help">
          N° {application.reference} · reçue le {formatLocalDate(application.received_at)}
        </p>
      </div>
      {application.cv && (
        <a
          href={applicationCvUrl(application.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-fit items-center gap-2 rounded-lg border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-info-bg"
        >
          <span className="material-symbols-outlined" aria-hidden="true">description</span>
          Voir le CV ({application.cv.name})
        </a>
      )}
      {application.profile_snapshot.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-section p-3">
          <p className="text-sm font-semibold text-heading">Profil au moment de la candidature</p>
          <ul aria-label="Profil au moment de la candidature" className="flex flex-col gap-0.5 text-sm text-help">
            {application.profile_snapshot.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {application.motivation && (
        <p className="rounded-lg bg-section p-3 text-base whitespace-pre-line text-heading">{application.motivation}</p>
      )}
      <p className="text-base font-semibold text-primary-active">
        {closed ? `${application.step_label} · ${application.outcome_label}` : `Étape ${application.step_number} sur 7 : ${application.step_label}`}
      </p>
      <ol aria-label="Étapes" className="flex flex-col gap-1">
        {application.history.map((change, index) => (
          <li key={index} className="text-sm text-help">
            {change.step_label}
            {change.outcome_label ? ` (${change.outcome_label})` : ''} — {formatLocalDate(change.at)} · {change.actor_name}
          </li>
        ))}
      </ol>
      {canAct && !closed && <Actions key={application.step} application={application} onChanged={setApplication} />}
    </li>
  )
}

/** US-902 : les candidatures du poste, dans l'ordre d'arrivée ; aucune n'est supprimée (RG-74). */
export default function OpeningApplications({ applications, canAct }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-6">
      <h3 id={titleId} className="text-lg font-semibold text-heading">
        Candidatures ({applications.length})
      </h3>
      {applications.length === 0 ? (
        <p className="text-help">Aucune candidature pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {applications.map((application) => (
            <ApplicationItem key={application.id} application={application} canAct={canAct} />
          ))}
        </ul>
      )}
    </section>
  )
}
