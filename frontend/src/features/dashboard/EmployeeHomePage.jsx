import { useEffect, useId } from 'react'
import { Link, useNavigate } from 'react-router'
import { getDossier } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { ELEMENT_LINKS } from '../certificates/elementLinks.js'
import { DEPOSIT_PATH } from '../certificates/paths.js'
import { CONSENT_PATH } from '../dossier/paths.js'

export const HOME_PATH = '/accueil'

/** Écran 06 : un titre, une phrase et un bouton par élément manquant. */
const REMAINING = {
  telephone: { title: 'Téléphone', text: 'Votre numéro principal', button: 'Compléter' },
  address: { title: 'Adresse', text: 'Votre adresse de résidence', button: 'Compléter' },
  email: { title: 'Email', text: "Votre adresse, ou « Je n'ai pas d'adresse email »", button: 'Compléter' },
  emergency_contact: { title: "Contact d'urgence", text: 'Personne à prévenir en cas d’urgence', button: 'Renseigner' },
  education_level: { title: "Niveau d'études", text: 'Votre plus haut niveau d’études', button: 'Compléter' },
  agency_confirmed: { title: 'Confirmer votre agence', text: 'Agence d’affectation', button: 'Confirmer' },
  position_confirmed: { title: 'Confirmer votre poste', text: 'Votre fonction actuelle', button: 'Confirmer' },
  hire_date_confirmed: { title: "Confirmer votre date d'embauche", text: 'Votre date d’entrée', button: 'Confirmer' },
}

async function load() {
  const [profile, dossier] = await Promise.all([getProfile(), getDossier()])
  return { profile, consentGiven: Boolean(dossier.consent.information_notice_at) }
}

function Ring({ percent }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  return (
    <div
      role="progressbar"
      aria-label="Progression du dossier"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative size-32"
    >
      <svg viewBox="0 0 100 100" className="size-32 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="10" className="stroke-status-neutral-bg" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset]"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-2xl font-bold text-heading tabular-nums">{percent} %</span>
        <span className="text-xs text-help">complété</span>
      </span>
    </div>
  )
}

function Remaining({ elements }) {
  const titleId = useId()
  const n = elements.length
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <span className="w-fit rounded-full bg-status-progress-bg px-3 py-1 text-sm font-semibold text-status-progress-text">
        ~{n} min estimée{n > 1 ? 's' : ''}
      </span>
      <div>
        <h3 id={titleId} className="text-lg font-semibold">
          Il reste {n} information{n > 1 ? 's' : ''} à compléter
        </h3>
        <p className="text-sm text-help">Indispensables avant de déposer votre certificat.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {elements.map((element) => {
          const item = REMAINING[element.key]
          return (
            <li key={element.key}>
              <Link
                to={ELEMENT_LINKS[element.key].to}
                className="flex min-h-14 items-center gap-3 rounded-lg bg-section px-3 py-2 hover:bg-info-bg"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-heading">{item.title}</span>
                  <span className="truncate text-sm text-help">{item.text}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-primary px-4 py-2 font-semibold text-white">{item.button}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DepositCard({ open }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-section p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="flex items-center gap-2 text-lg font-semibold">
          <span className="material-symbols-outlined" aria-hidden="true">{open ? 'lock_open' : 'lock'}</span>
          Dépôt de certificats
        </h3>
        {!open && (
          <span className="rounded-full bg-info-bg px-3 py-1 text-sm font-semibold text-info-text">
            Disponible dès votre profil complet
          </span>
        )}
      </div>
      {open ? (
        <>
          <p>Votre profil est complet : déposez vos diplômes et certificats pour les faire valider par les RH.</p>
          <Link
            to={DEPOSIT_PATH}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
            Déposer un certificat
          </Link>
        </>
      ) : (
        <>
          <p className="font-semibold text-info-text">Complétons votre profil pour valoriser votre certificat</p>
          <p className="text-sm">
            Dès que votre profil atteint 100 %, vous pourrez déposer vos diplômes et certificats pour les faire valider par
            les RH.
          </p>
        </>
      )}
    </section>
  )
}

/** US-207 CA-01, écran validé 06 : l'accueil de l'employé après la connexion. */
export default function EmployeeHomePage() {
  const navigate = useNavigate()
  const { data, error, loading } = useLoader(load)
  const needsConsent = data && !data.consentGiven

  // Écran 05 : à la première connexion, « Avant de commencer » passe d'abord.
  useEffect(() => {
    if (needsConsent) navigate(CONSENT_PATH, { replace: true, state: { next: HOME_PATH } })
  }, [needsConsent, navigate])

  const page = (children) => (
    <Page account title="Accueil">
      {children}
    </Page>
  )
  if (loading || needsConsent) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  const { profile } = data
  const { completion } = profile
  const missing = completion.elements.filter((element) => !element.complete)
  return page(
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <p className="text-sm text-help">Bienvenue sur votre espace</p>
        <h2 className="text-[26px] leading-8 font-bold text-balance">Bonjour {profile.first_name}</h2>
        <p className="text-help">
          {[profile.position, profile.affectation.agency].filter(Boolean).join(' · ')}
        </p>
        <Mascot role="Conseil carrière">
          {missing.length > 0
            ? `« Plus que ${missing.length} étape${missing.length > 1 ? 's' : ''}, ${profile.first_name} ! »`
            : `« Bravo ${profile.first_name}, votre profil est complet ! »`}
        </Mascot>
      </section>

      <section className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center shadow-card">
        <Ring percent={completion.percent} />
        <h3 className="text-lg font-semibold">Votre dossier est complet à {completion.percent} %</h3>
        <p className="text-help">
          {completion.complete} élément{completion.complete > 1 ? 's' : ''} complété{completion.complete > 1 ? 's' : ''} sur{' '}
          {completion.total}
        </p>
      </section>

      {missing.length > 0 && <Remaining elements={missing} />}
      <DepositCard open={completion.is_complete} />

      <section className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <span className="material-symbols-outlined text-info-text" aria-hidden="true">support_agent</span>
        <p>
          <span className="font-semibold text-heading">Besoin d'aide pour votre profil ?</span>
          <br />
          Une question ? Adressez-vous au service RH de votre agence.
        </p>
      </section>
    </>,
  )
}
