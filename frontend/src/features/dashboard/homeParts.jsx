import { useId } from 'react'
import { Link } from 'react-router'
import stairs from '../../assets/illustration-escalier.png'
import { CERTIFICATES_PATH, DEPOSIT_PATH } from '../certificates/paths.js'

/** US-123 : l'accueil « tableau de bord » (maquette validée le 2026-10-15), présentation seule. */

export const CAREER_PATH = '/carriere'
/** Directement sur la section, sans avoir à descendre (ancres de « Ma carrière »). */
const OPENINGS_LINK = `${CAREER_PATH}#postes-ouverts`
const APPLICATIONS_LINK = `${CAREER_PATH}#mes-candidatures`
export const PROFILE_PATH = '/profil'
const STEP_COUNT = 7
const DAY = 24 * 60 * 60 * 1000

const plural = (n, word, words = `${word}s`) => (n > 1 ? words : word)


const dateOf = (iso) => new Date(`${iso}T00:00:00`)
const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const daysUntil = (iso, today) => Math.round((dateOf(iso) - midnight(today)) / DAY)
const dayMonth = (iso) => dateOf(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function Go({ children, tone = 'text-primary' }) {
  return (
    <span className={`mt-auto flex items-center gap-0.5 pt-1 text-base font-semibold ${tone}`}>
      {children}
      <span className="material-symbols-outlined shrink-0 text-lg" aria-hidden="true">chevron_right</span>
    </span>
  )
}

/** US-128 : couleur de chaque tuile (rond de l'icône, lien), par les jetons de la charte. */
const TONES = {
  openings: { circle: 'bg-info-bg text-primary', link: 'text-primary' },
  certificates: { circle: 'bg-status-done-bg text-status-done-text', link: 'text-status-done-text' },
  application: { circle: 'bg-accent-bg text-accent-text', link: 'text-accent-text' },
  dossier: { circle: 'bg-primary-soft text-primary', link: 'text-primary' },
  locked: { circle: 'bg-section text-help', link: 'text-help' },
}

function Label({ icon, tone, children }) {
  return (
    <span className="flex flex-col gap-2.5">
      <span className={`flex size-11 items-center justify-center rounded-full ${TONES[tone].circle}`} aria-hidden="true">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <span className="text-base font-bold text-heading">{children}</span>
    </span>
  )
}

const TILE = 'flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card'

function Tile({ to, wide = false, children }) {
  return (
    <li className={`flex ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <Link to={to} className={`${TILE} w-full text-heading hover:bg-section`}>
        {children}
      </Link>
    </li>
  )
}

/** Tuile grisée d'un dossier incomplet : elle dit ce qui la débloque. */
function LockedTile({ icon, label }) {
  return (
    <li className="flex">
      <div className={`${TILE} w-full border-transparent bg-section/70 text-help shadow-none`}>
        <Label icon={icon} tone="locked">{label}</Label>
        <span className="text-[32px] leading-none font-bold tabular-nums">–</span>
        <span className="text-base">Après le dossier</span>
      </div>
    </li>
  )
}

function Value({ value, unit }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-[32px] leading-none font-bold tabular-nums">{value}</span>
      {unit && (
        <>
          {' '}
          <span className="text-base whitespace-nowrap text-help">{unit}</span>
        </>
      )}
    </span>
  )
}

function Bar({ parts }) {
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-section" aria-hidden="true">
      {parts.map(({ ratio, className }, index) => (
        <i key={index} className={className} style={{ width: `${Math.round(ratio * 100)}%` }} />
      ))}
    </span>
  )
}

/** US-123 CA-06 : un dossier incomplet passe en premier, les autres attendent. US-136 CA-03 : dossier complet, trois tuiles au plus, sans phrase. */
export function Tiles({ completion, missing, openings, certificates, application }) {
  const titleId = useId()
  const complete = completion.is_complete
  // Sur téléphone, le dossier prend toute la largeur quand il serait seul sur sa ligne (3 tuiles) ou passe en premier.
  const dossier = (
    <Tile key="dossier" to={PROFILE_PATH} wide>
      <Label icon="person" tone="dossier">Mon dossier</Label>
      {complete ? <Value value={completion.percent} unit="%" /> : <Value value={completion.complete} unit={`sur ${completion.total}`} />}
      <Bar parts={[{ ratio: completion.percent / 100, className: complete ? 'bg-status-done-dot' : 'bg-primary' }]} />
      <span className="text-base text-help">
        {complete
          ? 'À jour : les RH voient votre vrai profil.'
          : `Il manque : ${missing.map((element) => element.label.toLowerCase()).join(', ')}.`}
      </span>
      <Go tone={TONES.dossier.link}>{complete ? 'Voir mon dossier' : 'Continuer mon dossier'}</Go>
    </Tile>
  )

  if (!complete) {
    return (
      <section aria-labelledby={titleId}>
        <h2 id={titleId} className="sr-only">Vos chiffres</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {dossier}
          <LockedTile icon="verified" label="Mes certificats" />
          <LockedTile icon="work" label="Postes pour vous" />
        </ul>
      </section>
    )
  }

  const total = certificates.length
  const validated = certificates.filter((c) => c.status === 'VALIDATED').length
  const inReview = certificates.filter((c) => c.status === 'RECEIVED' || c.status === 'IN_REVIEW').length
  // US-136 CA-03 : sur téléphone, la troisième tuile prend toute la largeur plutôt que de rester seule à moitié.
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">Vos chiffres</h2>
      <ul className={`grid grid-cols-2 gap-3 ${application ? 'sm:grid-cols-3' : ''}`}>
        <Tile to={OPENINGS_LINK}>
          <Label icon="work" tone="openings">Postes pour vous</Label>
          <Value value={openings.length} />
          <Go tone={TONES.openings.link}>Voir les postes</Go>
        </Tile>
        <Tile to={CERTIFICATES_PATH}>
          <Label icon="verified" tone="certificates">Mes certificats</Label>
          <Value value={validated} unit={total ? `${plural(validated, 'validé')} sur ${total}` : 'certificat déposé'} />
          <Bar
            parts={[
              { ratio: total ? validated / total : 0, className: 'bg-status-done-dot' },
              { ratio: total ? inReview / total : 0, className: 'bg-status-progress-dot' },
            ]}
          />
          <Go tone={TONES.certificates.link}>Voir le suivi</Go>
        </Tile>
        {application && (
          <Tile to={APPLICATIONS_LINK} wide>
            <Label icon="send" tone="application">Ma candidature</Label>
            <Value value={application.step_number} unit={`étape sur ${STEP_COUNT}`} />
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, index) => (
                <i key={index} className={`h-1.5 flex-1 rounded-full ${index < application.step_number ? 'bg-accent-icon' : 'bg-section'}`} />
              ))}
            </span>
            <Go tone={TONES.application.link}>Suivre</Go>
          </Tile>
        )}
      </ul>
    </section>
  )
}

function PanelLink({ to, children }) {
  return (
    <Link to={to} className="flex min-h-11 items-center gap-0.5 text-base font-semibold text-primary hover:underline">
      {children}
      <span className="material-symbols-outlined shrink-0 text-lg" aria-hidden="true">chevron_right</span>
    </Link>
  )
}

/** US-128 CA-01 : bonjour, la phrase de bienvenue, l'action principale et le bandeau illustré (maquette du 2026-10-19). */
export function Hero({ firstName, canDeposit }) {
  return (
    <section className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2.5 2xl:flex-1">
        <h2 className="text-[28px] leading-9 font-extrabold tracking-tight text-primary-active lg:text-[34px] lg:leading-[42px]">
          Bonjour {firstName}
        </h2>
        <p className="text-base leading-relaxed text-help lg:text-lg">
          Bienvenue sur votre espace carrière. Ici, vous pouvez suivre vos dossiers, consulter les opportunités et gérer vos documents.
        </p>
        {canDeposit && (
          <Link
            to={DEPOSIT_PATH}
            className="mt-1 flex min-h-12 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
            Déposer un certificat
          </Link>
        )}
      </div>
      <div className="flex min-h-28 items-center gap-2 overflow-hidden rounded-2xl bg-info-bg 2xl:w-[22rem] 2xl:shrink-0">
        <img src={stairs} alt="" width="156" height="113" className="ml-3 h-24 w-auto shrink-0 lg:ml-5 lg:h-28" />
        <p className="py-4 pr-5 text-base leading-relaxed text-info-text">
          Votre engagement d’aujourd’hui construit votre avenir chez ACME SA.
        </p>
      </div>
    </section>
  )
}

/** US-128 CA-03 : le poste dont la date limite est la plus proche, mis en avant ; les autres dans « Ma carrière ». */
export function FeaturedOpening({ openings, today }) {
  const titleId = useId()
  const [opening] = [...openings].sort((a, b) => a.closes_on.localeCompare(b.closes_on))
  const n = opening?.criteria_lines.length ?? 0
  const days = opening ? daysUntil(opening.closes_on, today) : 0
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold text-primary-active">
          <span className="material-symbols-outlined text-accent-icon" aria-hidden="true">star</span>
          Poste ouvert pour vous
        </h2>
        {openings.length > 1 && <PanelLink to={OPENINGS_LINK}>{`Voir les ${openings.length} postes`}</PanelLink>}
      </div>
      {!opening ? (
        <p className="rounded-lg bg-section p-3 text-base text-heading">
          Aucun poste ouvert pour vous en ce moment. Chaque certificat validé peut vous en ouvrir de nouveaux.
        </p>
      ) : (
        <div className="flex gap-4">
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-xl bg-section text-primary sm:flex" aria-hidden="true">
            <span className="material-symbols-outlined text-[28px]">work</span>
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-lg break-words text-heading">{opening.title}</strong>
              <span className="inline-flex items-center gap-1 rounded-full bg-status-done-bg px-2.5 py-0.5 text-sm font-semibold text-status-done-text">
                <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
                {n > 0 ? `Vous remplissez les ${n} ${plural(n, 'critère')}` : 'Ouvert à tous'}
              </span>
            </div>
            <span className="text-base text-help">
              {opening.unit_label} · date limite le {dayMonth(opening.closes_on)} · reste {days} {plural(days, 'jour')}
            </span>
            {opening.mission && <p className="line-clamp-2 text-base text-body">{opening.mission}</p>}
            <Link
              to={`${CAREER_PATH}#poste-${opening.id}`}
              className="mt-1 flex min-h-12 w-fit items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
            >
              Voir le poste et postuler
              <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

/** US-136 CA-02 : ce que l'employé a à faire ; la section n'existe que s'il y a quelque chose. */
export function TodoSection({ children }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-lg font-bold text-primary-active">
        À faire
      </h2>
      {children}
    </section>
  )
}

/** Un certificat refusé par les RH : « Corriger » rouvre le dépôt de remplacement (US-130). */
export function CorrectionRow({ certificate }) {
  return (
    <Link
      to={`${DEPOSIT_PATH}?remplace=${encodeURIComponent(certificate.id)}`}
      className="flex min-h-14 items-center gap-3 rounded-xl bg-surface p-4 shadow-card hover:bg-section"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent-text" aria-hidden="true">
        <span className="material-symbols-outlined text-xl">edit_document</span>
      </span>
      <span className="min-w-0 flex-1 text-base font-semibold break-words text-heading">Certificat à corriger : {certificate.title}</span>
      <span className="flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-4 font-semibold text-white">Corriger</span>
    </Link>
  )
}
