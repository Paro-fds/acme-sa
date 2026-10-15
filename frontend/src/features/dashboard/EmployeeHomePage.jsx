import { useEffect, useId } from 'react'
import { Link, useNavigate } from 'react-router'
import { getMyCareer } from '../../api/career.js'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import { getDossier, getFreshness } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import { listMyApplications, listMyOpenings } from '../../api/openings.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { useLoader } from '../../lib/useLoader.js'
import { ELEMENT_LINKS } from '../certificates/elementLinks.js'
import { DEPOSIT_PATH } from '../certificates/paths.js'
import { CONSENT_PATH } from '../dossier/paths.js'
import NewForYouCard from '../notifications/NewForYouCard.jsx'
import { CareerFigures, DatesPanel, DiplomasCard, OpeningsPanel, Tiles, todayText, yearsSince } from './homeParts.jsx'
import StillAccurateCard from './StillAccurateCard.jsx'

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

/** Une donnée indisponible (hors connexion, service en panne) laisse sa partie vide sans bloquer l'accueil. */
const optional = (promise) => promise.catch(() => null)

/** US-123 : le profil d'abord ; les postes, certificats, candidatures et le parcours seulement si le dossier est complet. */
async function load() {
  const [profile, dossier, freshness] = await Promise.all([getProfile(), getDossier(), getFreshness()])
  const base = { profile, freshness, consentGiven: Boolean(dossier.consent.information_notice_at) }
  if (!profile.completion.is_complete) return base
  const [openings, certificates, applications, career, form] = await Promise.all([
    optional(listMyOpenings()),
    optional(listCertificates()),
    optional(listMyApplications()),
    optional(getMyCareer()),
    optional(getCertificateForm()),
  ])
  return { ...base, openings, certificates, applications, career, form }
}

/** Plus haut diplôme validé, dans l'ordre de l'échelle des niveaux. */
function highestDiploma(certificates, form) {
  const order = (form?.levels ?? []).map((level) => level.value)
  const validated = (certificates?.certificates ?? []).filter((c) => c.status === 'VALIDATED')
  if (validated.length === 0) return null
  return validated.reduce((best, c) => (order.indexOf(c.level) > order.indexOf(best.level) ? c : best)).level_label
}

/** La candidature en cours la plus récente (une candidature clôturée ne compte plus). */
function currentApplication(applications) {
  const open = (applications?.items ?? []).filter((a) => a.step !== 'CLOSED')
  return open.sort((a, b) => b.received_at.localeCompare(a.received_at))[0] ?? null
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
        <p className="text-base text-help">Indispensables avant de déposer votre certificat.</p>
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
                  <span className="truncate text-base font-semibold text-heading">{item.title}</span>
                  <span className="truncate text-base text-help">{item.text}</span>
                </span>
                <span className="flex min-h-11 min-w-24 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-white shadow-card">
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

/**
 * US-207 CA-01 : l'accueil de l'employé après la connexion ; à la première connexion, « Avant de commencer » d'abord.
 * US-123 : tableau de bord (maquette validée le 2026-10-15) : en-tête sobre, tuiles chiffrées, postes ouverts,
 * dates à retenir, diplômes, parcours en chiffres ; sur ordinateur, les dates et les diplômes à droite.
 */
export default function EmployeeHomePage() {
  const navigate = useNavigate()
  const { data, error, loading } = useLoader(load)
  const needsConsent = data && !data.consentGiven
  const desktop = useIsDesktop()

  // Écran 05 : à la première connexion, « Avant de commencer » passe d'abord.
  useEffect(() => {
    if (needsConsent) navigate(CONSENT_PATH, { replace: true, state: { next: HOME_PATH } })
  }, [needsConsent, navigate])

  const page = (children, aside) => (
    <Page account title="Accueil" aside={aside} asideLabel="Dates et diplômes">
      {children}
    </Page>
  )
  if (loading || needsConsent) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  const today = new Date()
  const { profile, freshness } = data
  const { completion } = profile
  const complete = completion.is_complete
  const missing = completion.elements.filter((element) => !element.complete)
  const openings = data.openings?.items ?? []
  const n = missing.length
  const lead = !complete
    ? `Plus que ${n} information${n > 1 ? 's' : ''}, et vos diplômes pourront vous ouvrir de nouveaux postes.`
    : openings.length > 1
      ? `${openings.length} postes correspondent déjà à votre profil.`
      : openings.length === 1
        ? 'Un poste correspond déjà à votre profil.'
        : 'Votre dossier est complet : chaque diplôme validé peut vous ouvrir de nouveaux postes.'

  const side = complete && (
    <>
      <DatesPanel openings={openings} freshness={freshness} today={today} />
      <DiplomasCard />
    </>
  )
  return page(
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-base text-help">{todayText(today)}</p>
          <h2 className="text-[26px] leading-[34px] font-bold tracking-tight text-balance text-primary-active lg:text-[30px] lg:leading-[38px]">
            Bonjour {profile.first_name}
          </h2>
          <p className="text-base text-body">{lead}</p>
          <p className="text-base text-help">{[profile.position, profile.affectation.agency].filter(Boolean).join(' · ')}</p>
        </div>
        {complete && (
          <Link
            to={DEPOSIT_PATH}
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
            Déposer un certificat
          </Link>
        )}
      </section>

      <NewForYouCard />
      <StillAccurateCard freshness={freshness} />
      <Tiles
        completion={completion}
        missing={missing}
        openings={openings}
        certificates={data.certificates?.certificates ?? []}
        application={currentApplication(data.applications)}
      />
      {!complete && <Remaining elements={missing} />}
      {complete && <OpeningsPanel openings={openings} today={today} />}
      {complete && !desktop && side}
      {complete && (
        <CareerFigures
          years={yearsSince(profile.hire_date, today)}
          highestDiploma={highestDiploma(data.certificates, data.form)}
          entries={data.career ? data.career.kinds.reduce((sum, kind) => sum + kind.count, 0) : null}
        />
      )}
    </>,
    desktop && complete ? side : undefined,
  )
}
