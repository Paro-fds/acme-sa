import { useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { applyToOpening, listMyApplications, listMyOpenings, sendCv, withdrawApplication } from '../../api/openings.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import CareerTimeline from '../career/CareerTimeline.jsx'
import ProfileCompetences from './ProfileCompetences.jsx'
import ProfileSections from './ProfileSections.jsx'
import { formatDate, formatLocalDate } from '../../lib/format.js'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

/** US-131 CA-05 : les 7 étapes du circuit des RH, dans l'ordre (codes de l'API). */
const STEPS = [
  ['RECEIVED', 'Reçue et enregistrée'],
  ['DRH_REVIEW', 'Étude par la DRH'],
  ['MANAGER', 'Consultation du responsable du département'],
  ['EVALUATION', 'Évaluation, si nécessaire'],
  ['DRH_DECISION', 'Décision de la DRH'],
  ['DG_APPROVAL', 'Approbation de la Direction Générale'],
  ['CLOSED', 'Clôture'],
]
const DAY = 24 * 60 * 60 * 1000
/** Au-delà, « reste N jours » ne dit plus rien d'utile : la date limite est donnée. */
const SOON_DAYS = 90
const dayMonth = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Jours entiers d'aujourd'hui à la date limite. */
function daysLeft(closesOn, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((new Date(`${closesOn}T00:00:00`) - today) / DAY)
}

/** US-123 : ancres des sections, pour arriver de l'accueil directement sur les postes ou les candidatures. */
export const OPENINGS_ANCHOR = 'postes-ouverts'
export const APPLICATIONS_ANCHOR = 'mes-candidatures'
/** US-131 CA-04 : `#poste-<id>` ouvre la carte de ce poste. */
const openingAnchor = (id) => `poste-${id}`
const ANCHORED_HEADING = 'scroll-mt-24 text-xl font-bold text-primary-active outline-none'

/** Une fois la page chargée, descend jusqu'à la section de l'adresse (#…) et y place le focus (lecteur d'écran). */
function useScrollToHash(ready) {
  const { hash } = useLocation()
  useEffect(() => {
    if (!ready || !hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!target) return
    target.scrollIntoView?.()
    target.focus({ preventScroll: true })
  }, [ready, hash])
}

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

/**
 * US-131 CA-03 : petite carte (intitulé, unité, jours restants, critères) ; « Voir le poste et postuler » la déplie
 * sur place avec tout le détail (US-801, US-119) et le formulaire (US-902).
 */
function OpeningCard({ opening, application, onApplied, initiallyOpen }) {
  const titleId = openingAnchor(opening.id)
  const detailId = useId()
  const [open, setOpen] = useState(initiallyOpen)
  const [applying, setApplying] = useState(false)
  const n = opening.criteria_lines.length
  const days = daysLeft(opening.closes_on)
  return (
    <li>
      <article aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-1.5">
          <h3 id={titleId} tabIndex={-1} className="scroll-mt-24 text-lg font-bold break-words text-heading outline-none">
            {opening.title}
          </h3>
          <p className="text-help">
            {opening.unit_label} ·{' '}
            {days <= SOON_DAYS ? `reste ${days} jour${days > 1 ? 's' : ''}` : `jusqu’au ${formatDate(opening.closes_on)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-status-done-bg px-2.5 py-0.5 text-sm font-semibold text-status-done-text">
              <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
              {n > 0 ? `${n} critère${n > 1 ? 's' : ''} sur ${n}` : 'Ouvert à tous'}
            </span>
            {application && (
              <span className="inline-flex w-fit items-center rounded-full bg-info-bg px-2.5 py-0.5 text-sm font-semibold text-info-text">
                Candidature envoyée
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-fit items-center gap-1 font-semibold text-primary hover:underline"
        >
          {open ? 'Masquer le poste' : application ? 'Voir le poste' : 'Voir le poste et postuler'}
          <span className={`material-symbols-outlined text-xl transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
            keyboard_arrow_down
          </span>
        </button>
        <div id={detailId} hidden={!open} className="flex flex-col gap-3 border-t border-border pt-3">
          {open && (
            <>
              {opening.profile_department && (
                <span className="w-fit rounded-full bg-info-bg px-2.5 py-0.5 text-sm font-semibold text-info-text">
                  {opening.profile_department}
                </span>
              )}
              <p className="flex items-center gap-1.5 text-sm font-semibold text-heading">
                <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">event</span>
                Candidatures jusqu’au {formatDate(opening.closes_on)}
              </p>
              <p className="text-base whitespace-pre-line text-body">{opening.mission}</p>
              <ProfileCompetences competences={opening.competences} />
              <ProfileSections sections={opening.sections} />
              {n > 0 && (
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
            </>
          )}
        </div>
      </article>
    </li>
  )
}

/** US-131 CA-05 : les étapes passées avec leur date (une évaluation sautée : « non nécessaire »), l'étape en cours, les suivantes. */
function ApplicationSteps({ application }) {
  const current = STEPS.findIndex(([code]) => code === application.step)
  const dateOf = (code) => [...application.history].reverse().find((change) => change.step === code)?.at
  return (
    <ol aria-label="Étapes de la candidature" className="flex flex-col">
      {STEPS.map(([code, label], index) => {
        if (index < current) {
          const at = dateOf(code)
          return (
            <li key={code} className="flex min-h-10 items-center gap-3 text-help">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-status-done-bg text-status-done-text" aria-hidden="true">
                <span className="material-symbols-outlined text-base">check</span>
              </span>
              <span>
                {label} · {at ? dayMonth(at) : 'non nécessaire'}
              </span>
            </li>
          )
        }
        if (index === current) {
          const since = dateOf(code)
          return (
            <li key={code} aria-current="step" className="my-1 flex items-start gap-3 rounded-lg bg-highlight p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold text-primary-active">{label}</span>
                {since && <span className="text-sm text-help">En cours depuis le {dayMonth(since)}</span>}
              </span>
            </li>
          )
        }
        return (
          <li key={code} className="flex min-h-10 items-center gap-3 text-help">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold">
              {index + 1}
            </span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
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
    <li aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-0.5">
        <h3 id={titleId} className="text-lg font-bold break-words text-heading">
          {application.opening_title}
        </h3>
        <p className="text-sm text-help">
          {application.reference} · envoyée le {dayMonth(application.received_at)}
        </p>
        {application.cv && <p className="text-sm text-help">CV joint : {application.cv.name}</p>}
      </div>
      {closed ? (
        <p className="rounded-lg bg-section p-3 text-base font-semibold text-heading">
          {application.step_label} · {application.outcome_label}
        </p>
      ) : (
        <ApplicationSteps application={application} />
      )}
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

/** Des marches vers un drapeau, dessinées avec les jetons de la charte. */
function PathIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 200 150" aria-hidden="true" className="h-24 w-auto shrink-0 lg:h-28">
      <path d="M0 150 C25 100 55 90 85 102 C110 72 150 58 200 84 L200 150 Z" className="fill-highlight" />
      <rect x="34" y="104" width="34" height="14" rx="3" className="fill-primary-soft" />
      <rect x="68" y="88" width="34" height="30" rx="3" className="fill-info-border" />
      <rect x="102" y="70" width="34" height="48" rx="3" className="fill-primary" />
      <path d="M128 70 V30" strokeWidth="3" strokeLinecap="round" className="stroke-primary-active" />
      <path d="M128 31 L152 39 L128 47 Z" className="fill-accent-icon" />
      <circle cx="51" cy="94" r="7" className="fill-status-done-text" />
    </svg>
  )
}

/** US-131 CA-01 : titre, phrase d'accroche et bandeau illustré (à côté seulement sur très grand écran). */
function CareerHero() {
  return (
    <section className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2.5 2xl:flex-1">
        <h2 className="text-[28px] leading-9 font-extrabold tracking-tight text-primary-active lg:text-[34px] lg:leading-[42px]">
          Ma carrière
        </h2>
        <p className="text-base leading-relaxed text-help lg:text-lg">
          Votre parcours, de vos études à aujourd’hui, les postes ouverts pour vous et le suivi de vos candidatures.
        </p>
      </div>
      <div className="flex min-h-28 items-center gap-2 overflow-hidden rounded-2xl bg-info-bg 2xl:w-[24rem] 2xl:shrink-0">
        <PathIllustration />
        <p className="py-4 pr-5 text-base leading-relaxed text-info-text">Chaque étape de votre parcours compte pour la suivante.</p>
      </div>
    </section>
  )
}

/**
 * US-801, US-902 (choix du 2026-10-11) : « Ma carrière » montre les postes publiés auxquels l'employé est apte,
 * lui permet d'y postuler et de suivre ses candidatures dans le circuit des RH.
 * US-114 : la frise du parcours vient en premier ; postes et candidatures à droite sur ordinateur, dessous sur téléphone.
 * US-131 (refonte du 2026-10-19) : en-tête illustré, postes en cartes dépliables, les 7 étapes de la candidature.
 */
export default function MyOpeningsPage() {
  const { data, loading, error, reload } = useLoader(load)
  const [received, setReceived] = useState(null)
  const desktop = useIsDesktop()
  const { hash } = useLocation()
  useScrollToHash(Boolean(data))
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
        <h2 id={OPENINGS_ANCHOR} tabIndex={-1} className={ANCHORED_HEADING}>
          Postes ouverts pour vous{data ? ` · ${data.openings.length}` : ''}
        </h2>
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
        <ul aria-label="Postes ouverts pour vous" className="flex flex-col gap-3">
          {data.openings.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              application={active(opening.id)}
              onApplied={applied}
              initiallyOpen={hash === `#${openingAnchor(opening.id)}`}
            />
          ))}
        </ul>
      )}
      {data && data.openings.length === 0 && (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-border bg-surface p-4 text-base text-heading shadow-card">
            Aucun poste ouvert ne correspond à votre profil pour le moment.
          </p>
          {tip}
        </div>
      )}
      {data && data.applications.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 id={APPLICATIONS_ANCHOR} tabIndex={-1} className={ANCHORED_HEADING}>
            Mes candidatures
          </h2>
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
      <CareerHero />
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
