import { useId, useState } from 'react'
import { Link } from 'react-router'
import Alert from '../../components/Alert.jsx'
import Avatar from '../../components/Avatar.jsx'
import Button from '../../components/Button.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { formatDate, formatGender } from '../../lib/format.js'
import { ItemStatus, ReportForm } from '../dossier/hrInformationParts.jsx'
import { CONTACT_EDUCATION_PATH, COORDINATES_PATH, HR_INFORMATION_PATH } from '../dossier/paths.js'

/** US-129 : « Mon dossier » de la refonte (maquette `MonDossier.dc.html`), présentation seule. */

const CARD = 'rounded-xl border border-border bg-surface shadow-card'

/** Dossier, fiche et coche verte, dessinés avec les jetons de la charte. */
function DossierIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 200 150" aria-hidden="true" className="h-24 w-auto shrink-0 lg:h-28">
      <path d="M0 150 C25 100 55 90 85 102 C110 72 150 58 200 84 L200 150 Z" className="fill-highlight" />
      <rect x="62" y="22" width="84" height="112" rx="8" strokeWidth="2" className="fill-surface stroke-info-border" />
      <rect x="86" y="14" width="36" height="16" rx="5" className="fill-primary" />
      <circle cx="104" cy="56" r="13" className="fill-primary-soft" />
      <circle cx="104" cy="52" r="5" className="fill-primary-active" />
      <path d="M95 66 C97 60 111 60 113 66" className="fill-primary-active" />
      <rect x="76" y="82" width="56" height="6" rx="3" className="fill-primary-soft" />
      <rect x="76" y="96" width="44" height="6" rx="3" className="fill-primary-soft" />
      <rect x="76" y="110" width="50" height="6" rx="3" className="fill-primary-soft" />
      <circle cx="146" cy="116" r="17" className="fill-status-done-text" />
      <path d="m138 116 6 6 10-11" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-surface" />
    </svg>
  )
}

/** CA-01 : titre, phrase d'accroche et bandeau illustré (à côté seulement sur très grand écran, comme l'accueil). */
export function DossierHero() {
  return (
    <section className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2.5 2xl:flex-1">
        <h2 className="text-[28px] leading-9 font-extrabold tracking-tight text-primary-active lg:text-[34px] lg:leading-[42px]">
          Mon dossier
        </h2>
        <p className="text-base leading-relaxed text-help lg:text-lg">
          Vos informations personnelles et votre situation chez ACME. Vérifiez-les une fois par an : les RH s’en servent pour
          vous proposer des postes.
        </p>
      </div>
      <div className="flex min-h-28 items-center gap-2 overflow-hidden rounded-2xl bg-info-bg 2xl:w-[24rem] 2xl:shrink-0">
        <DossierIllustration />
        <p className="py-4 pr-5 text-base leading-relaxed text-info-text">
          Un dossier à jour, ce sont des postes qui vous correspondent.
        </p>
      </div>
    </section>
  )
}

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const longDate = (date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** « Dernière confirmation le … · prochaine avant le … » (US-205) ; rien si aucune information n'est confirmée. */
function confirmationLine(freshness) {
  const items = freshness?.items ?? []
  if (items.length === 0) return null
  const last = items.map((item) => item.confirmed_at).sort().at(-1)
  const next = items.map((item) => item.expires_on).sort()[0]
  return `Dernière confirmation le ${longDate(new Date(last))} · prochaine avant le ${longDate(new Date(`${next}T00:00:00`))}`
}

/** CA-02 : l'anneau de progression (sans titre ni pourcentage écrits, choix du 2026-10-19), ce qui est saisi et la prochaine confirmation ;
 * US-136 CA-07 : seulement tant que le dossier est incomplet. */
export function DossierProgressRing({ completion, freshness }) {
  const titleId = useId()
  const { percent, complete, total } = completion
  const done = complete >= total
  const line = confirmationLine(freshness)
  // US-136 CA-07 : un dossier complet n'a plus besoin de cette carte (demande du 2026-10-20).
  if (done) return null
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-wrap items-center gap-6 p-5 lg:p-6`}>
      <div
        role="progressbar"
        aria-label="Progression du dossier"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative size-26 shrink-0"
      >
        <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true" className="size-full">
          <circle cx="52" cy="52" r={RADIUS} fill="none" strokeWidth="12" className="stroke-primary-soft" />
          {percent > 0 && (
          <circle
            cx="52"
            cy="52"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(CIRCUMFERENCE * percent) / 100} ${CIRCUMFERENCE}`}
            transform="rotate(-90 52 52)"
            className={done ? 'stroke-status-done-dot' : 'stroke-primary'}
          />
          )}
        </svg>
      </div>
      <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1.5">
        <h3 id={titleId} className="sr-only">
          Progression du dossier
        </h3>
        <p className="text-lg leading-relaxed text-heading">
          {complete} information{complete > 1 ? 's' : ''} sur {total} saisie{complete > 1 ? 's' : ''} ou confirmée
          {complete > 1 ? 's' : ''}.{' '}
          {done ? 'Vous pouvez déposer des certificats et postuler.' : 'Complétez-le pour déposer des certificats et postuler.'}
        </p>
        {line && <p className="text-help">{line}</p>}
      </div>
    </section>
  )
}

const PART_TONES = {
  1: 'bg-info-bg text-primary',
  2: 'bg-status-done-bg text-status-done-text',
  3: 'bg-accent-bg text-accent-text',
}

function PartIcon({ number, icon }) {
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${PART_TONES[number]}`} aria-hidden="true">
      <span className="material-symbols-outlined">{icon}</span>
    </span>
  )
}

function PartTitle({ number, title, text, id, as: Title = 'span' }) {
  return (
    <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1">
      <span className="text-sm font-semibold text-help">Partie {number} sur 3</span>
      <Title id={id} className="text-lg font-bold text-heading">
        {title}
      </Title>
      <span className="text-help">{text}</span>
    </span>
  )
}

function PartLink({ to, number, icon, title, text, complete }) {
  return (
    <li>
      <Link to={to} className={`${CARD} flex flex-wrap items-center gap-4 p-4 text-heading hover:bg-section lg:p-5`}>
        <PartIcon number={number} icon={icon} />
        <PartTitle number={number} title={title} text={text} />
        <span className="flex items-center gap-2">
          {complete ? <StatusBadge tone="done">À jour</StatusBadge> : <StatusBadge tone="neutral">À compléter</StatusBadge>}
          <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
        </span>
      </Link>
    </li>
  )
}

/** CA-04 : une information RH ; les boutons seulement tant qu'elle n'est ni confirmée ni signalée. */
function HrRow({ item, canAnswer, onConfirm, onReport, sending, fieldError, error }) {
  const [reporting, setReporting] = useState(false)
  const pending = item.status === 'TO_CONFIRM'
  return (
    <li className="flex flex-col gap-3 border-t border-border py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex min-w-0 flex-[1_1_12rem] flex-col">
          <span className="text-sm text-help">{item.label}</span>
          <span className="text-lg font-semibold break-words text-heading">{item.value}</span>
        </span>
        {pending && canAnswer && !reporting ? (
          <span className="flex flex-wrap gap-2 [&>button]:min-h-11 [&>button]:w-auto [&>button]:px-4">
            <Button onClick={() => onConfirm(item)} disabled={sending}>
              C'est exact
            </Button>
            <Button variant="secondary" onClick={() => setReporting(true)}>
              Signaler une erreur
            </Button>
          </span>
        ) : (
          !reporting && <ItemStatus item={item} />
        )}
      </div>
      {reporting && (
        <>
          <ReportForm
            item={item}
            onSend={async (values) => (await onReport(item, values)) && setReporting(false)}
            onCancel={() => setReporting(false)}
            sending={sending}
            fieldError={fieldError}
          />
          {error && !error.field && <Alert>{error.message}</Alert>}
        </>
      )}
    </li>
  )
}

/**
 * CA-03, CA-04 : « Mes informations, en 3 parties ». Parties 1 et 2 : un lien vers leur page avec leur état.
 * Partie 3 : les informations RH à confirmer ou signaler ici ; sans consentement (CA-07), seulement le lien.
 */
export function DossierParts({ dossier, hr }) {
  const titleId = useId()
  const part3Id = useId()
  const canAnswer = Boolean(dossier.consent.information_notice_at)
  const coordinates = dossier.telephone.complete && dossier.address.complete && dossier.email.complete
  const contact = dossier.emergency_contact.complete && dossier.education_level.complete
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h3 id={titleId} className="text-xl font-bold text-primary-active">
        Mes informations, en 3 parties
      </h3>
      <ul className="flex flex-col gap-3">
        <PartLink to={COORDINATES_PATH} number={1} icon="call" title="Mes coordonnées" text="Téléphone, adresse, email" complete={coordinates} />
        <PartLink
          to={CONTACT_EDUCATION_PATH}
          number={2}
          icon="school"
          title="Contact d’urgence et études"
          text="Une personne à prévenir, votre niveau d’études"
          complete={contact}
        />
      </ul>
      <section aria-labelledby={part3Id} className={`${CARD} flex flex-col gap-3 p-4 lg:p-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <PartIcon number={3} icon="work" />
          <PartTitle
            number={3}
            id={part3Id}
            as="h4"
            title="Mes informations RH"
            text="Ce que les RH savent de vous : confirmez ou signalez une erreur"
          />
          <Link to={HR_INFORMATION_PATH} className="flex min-h-11 items-center gap-0.5 font-semibold text-primary hover:underline">
            Ouvrir la partie 3
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span>
          </Link>
        </div>
        <ul className="flex flex-col">
          {dossier.hr_information.map((item) => (
            <HrRow key={item.key} item={item} canAnswer={canAnswer} {...hr} />
          ))}
        </ul>
      </section>
    </section>
  )
}

/** CA-05 : l'identité connue des RH, en lecture seule. */
export function IdentityCard({ profile }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-col gap-4 p-5`}>
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} photoUrl={profile.photo_url} size="lg" />
          {profile.photo_url && <span className="text-xs text-help">Photo officielle</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={titleId} className="text-lg font-bold break-words text-primary-active">
            {profile.first_name} {profile.last_name}
          </h3>
          <span className="text-help">Matricule {profile.employee_code}</span>
        </div>
      </div>
      <dl className="flex flex-col gap-2.5">
        <div className="flex justify-between gap-3">
          <dt className="text-help">Date de naissance</dt>
          <dd className="font-semibold text-heading">{formatDate(profile.birth_date)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-help">Sexe</dt>
          <dd className="font-semibold text-heading">{formatGender(profile.gender)}</dd>
        </div>
      </dl>
      <p className="flex items-start gap-2.5 rounded-lg bg-section px-3 py-2.5 text-help">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-xl leading-none text-muted" aria-hidden="true">lock</span>
        Non modifiable : une erreur ? Signalez-la aux RH.
      </p>
    </section>
  )
}

/** CA-05 : à quoi servent les données, et qui les voit. */
export function WhyCard() {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-info-bg p-5">
      <h3 id={titleId} className="text-lg font-bold text-primary-active">
        Pourquoi nous collectons ces données ?
      </h3>
      <p className="leading-relaxed text-help">Pour vous joindre, vous prévenir d’un poste ouvert et tenir votre dossier RH à jour.</p>
      <h4 className="mt-1 text-lg font-bold text-primary-active">Qui y a accès ?</h4>
      <p className="leading-relaxed text-help">Le service RH seulement. Chaque consultation est enregistrée.</p>
    </section>
  )
}

/** CA-06 : le détail complet, replié en bas de la page. */
export function DossierDetail({ children }) {
  return (
    <details className={`${CARD} group`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-primary [&::-webkit-details-marker]:hidden">
        Voir tout le détail de mon dossier
        <span className="material-symbols-outlined transition-transform group-open:rotate-180" aria-hidden="true">keyboard_arrow_down</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-border p-4">{children}</div>
    </details>
  )
}
