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

/** Écran 06 : une icône, un titre, une phrase et un bouton par élément manquant. */
const REMAINING = {
  telephone: { icon: 'call', title: 'Téléphone', text: 'Votre numéro principal', button: 'Compléter' },
  address: { icon: 'home_pin', title: 'Adresse', text: 'Votre adresse de résidence', button: 'Compléter' },
  email: { icon: 'mail', title: 'Email', text: "Votre adresse, ou « Je n'ai pas d'adresse email »", button: 'Compléter' },
  emergency_contact: {
    icon: 'contact_phone',
    title: "Contact d'urgence",
    text: 'Personne à prévenir en cas d’urgence',
    button: 'Renseigner',
  },
  education_level: { icon: 'school', title: "Niveau d'études", text: 'Votre plus haut niveau d’études', button: 'Compléter' },
  agency_confirmed: { icon: 'apartment', title: 'Confirmer votre agence', text: 'Agence d’affectation', button: 'Confirmer' },
  position_confirmed: { icon: 'badge', title: 'Confirmer votre poste', text: 'Votre fonction actuelle', button: 'Confirmer' },
  hire_date_confirmed: {
    icon: 'event',
    title: "Confirmer votre date d'embauche",
    text: 'Votre date d’entrée',
    button: 'Confirmer',
  },
}

async function load() {
  const [profile, dossier] = await Promise.all([getProfile(), getDossier()])
  return { profile, consentGiven: Boolean(dossier.consent.information_notice_at) }
}

/** Anneau de l'écran 06 (`code.html`) : 112 px, trait de 8, fond bleu pâle, pourcentage en bleu. */
function Ring({ percent }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  return (
    <div
      role="progressbar"
      aria-label="Progression du dossier"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative size-28 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-highlight" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8.5"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset]"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-[22px] leading-none font-bold text-primary tabular-nums">{percent} %</span>
        <span className="mt-0.5 text-xs text-help">complété</span>
      </span>
    </div>
  )
}

function Remaining({ elements }) {
  const titleId = useId()
  const n = elements.length
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card">
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-bg px-2 py-0.5 text-sm font-semibold text-accent-text">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>~{n} min estimée
        {n > 1 ? 's' : ''}
      </span>
      <div>
        <h3 id={titleId} className="text-lg font-bold">
          Il reste {n} information{n > 1 ? 's' : ''} à compléter
        </h3>
        <p className="text-sm text-help">Indispensables avant de déposer votre certificat.</p>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {elements.map((element) => {
          const item = REMAINING[element.key]
          return (
            <li key={element.key}>
              <Link
                to={ELEMENT_LINKS[element.key].to}
                className="flex min-h-14 items-center gap-2 rounded-xl bg-canvas p-2 hover:bg-section"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-bg/60 text-accent-icon"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-heading">{item.title}</span>
                  <span className="truncate text-sm text-help">{item.text}</span>
                </span>
                <span className="flex min-h-11 min-w-24 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-card">
                  {item.button}
                </span>
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
    <section
      aria-labelledby={titleId}
      className={`flex items-start gap-3 rounded-xl p-4 ${open ? 'bg-surface shadow-card' : 'bg-section/70'}`}
    >
      <span
        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight ${
          open ? 'text-primary' : 'text-muted'
        }`}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-xl">{open ? 'lock_open' : 'lock'}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={titleId} className="text-lg font-semibold">
            Dépôt de certificats
          </h3>
          {!open && (
            <span className="rounded-full bg-border px-2 py-0.5 text-sm text-help">Disponible dès votre profil complet</span>
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
            <p className="font-semibold text-primary">Complétons votre profil pour valoriser votre certificat</p>
            <p className="leading-relaxed text-help">
              Dès que votre profil atteint 100 %, vous pourrez déposer vos diplômes et certificats pour les faire valider
              par les RH.
            </p>
            <span className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-highlight px-4 text-sm font-semibold text-help select-none sm:w-fit">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock_clock</span>
              Déblocage à 100 % du profil
            </span>
          </>
        )}
      </div>
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
      <section className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card">
        <div className="flex flex-col">
          <p className="text-sm text-help">Bienvenue sur votre espace</p>
          <h2 className="text-[26px] leading-[34px] font-bold tracking-tight text-balance text-primary-active">
            Bonjour {profile.first_name}
          </h2>
          <p className="mt-0.5 text-help">{[profile.position, profile.affectation.agency].filter(Boolean).join(' · ')}</p>
        </div>
        <Mascot role="Conseil carrière">
          {missing.length > 0
            ? `« Plus que ${missing.length} étape${missing.length > 1 ? 's' : ''}, ${profile.first_name} ! »`
            : `« Bravo ${profile.first_name}, votre profil est complet ! »`}
        </Mascot>
      </section>

      <section className="flex flex-col items-center gap-4 rounded-xl bg-surface p-4 text-center shadow-card sm:flex-row sm:text-left">
        <Ring percent={completion.percent} />
        <div className="flex min-w-0 flex-col">
          <p className="mb-1 flex items-center justify-center gap-1.5 text-sm font-semibold tracking-wider text-primary uppercase sm:justify-start">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">task_alt</span>
            Avancement du profil
          </p>
          <h3 className="text-lg font-bold">Votre dossier est complet à {completion.percent} %</h3>
          <p className="mt-1 text-help">
            {completion.complete} élément{completion.complete > 1 ? 's' : ''} complété{completion.complete > 1 ? 's' : ''}{' '}
            sur {completion.total} au total.
          </p>
        </div>
      </section>

      {missing.length > 0 && <Remaining elements={missing} />}
      <DepositCard open={completion.is_complete} />

      <section className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-primary-active"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-xl">support_agent</span>
        </span>
        <p className="flex flex-col">
          <span className="text-sm font-semibold text-heading">Besoin d'aide pour votre profil ?</span>
          <span className="text-sm text-help">Une question ? Adressez-vous au service RH de votre agence.</span>
        </p>
      </section>
    </>,
  )
}
