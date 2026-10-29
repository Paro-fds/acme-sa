import { useId } from 'react'
import { Link } from 'react-router'
import { certificateFileUrl } from '../../api/certificates.js'
import CertificateStatus from './CertificateStatus.jsx'
import { DEPOSIT_PATH } from './paths.js'

/** US-130 : « Mes certificats » de la refonte (maquette `MesCertificats.dc.html`), présentation seule. */

const CARD = 'rounded-xl border border-border bg-surface shadow-card'
const shortDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dayMonth = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Un certificat encadré et sa médaille, dessinés avec les jetons de la charte. */
function CertificateIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 200 150" aria-hidden="true" className="h-24 w-auto shrink-0 lg:h-28">
      <path d="M0 150 C25 100 55 90 85 102 C110 72 150 58 200 84 L200 150 Z" className="fill-highlight" />
      <rect x="40" y="30" width="112" height="82" rx="6" strokeWidth="2" className="fill-surface stroke-info-border" />
      <rect x="48" y="38" width="96" height="66" rx="3" fill="none" strokeWidth="2" className="stroke-primary-soft" />
      <rect x="66" y="50" width="60" height="7" rx="3.5" className="fill-primary-active" />
      <rect x="60" y="64" width="72" height="5" rx="2.5" className="fill-primary-soft" />
      <rect x="68" y="75" width="56" height="5" rx="2.5" className="fill-primary-soft" />
      <path d="m132 112 -6 24 16 -8 16 8 -6 -24" className="fill-primary" />
      <circle cx="142" cy="102" r="16" className="fill-accent-icon" />
      <circle cx="142" cy="102" r="10" fill="none" strokeWidth="2.5" className="stroke-surface" />
    </svg>
  )
}

/** CA-01 : titre, phrase d'accroche, « Déposer un certificat » (ou le maximum atteint) et le bandeau illustré. */
export function CertificatesHero({ full, limit }) {
  return (
    <section className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2.5 2xl:flex-1">
        <h2 className="text-[28px] leading-9 font-extrabold tracking-tight text-primary-active lg:text-[34px] lg:leading-[42px]">
          Mes certificats
        </h2>
        <p className="text-base leading-relaxed text-help lg:text-lg">
          Déposez vos diplômes et attestations. Les RH les vérifient, puis ils comptent pour les postes qui vous sont proposés.
        </p>
        {full ? (
          <p className="mt-1 rounded-lg bg-info-bg p-3 text-info-text">Vous avez déposé {limit} certificats, le nombre maximum.</p>
        ) : (
          <Link
            to={DEPOSIT_PATH}
            className="mt-1 flex min-h-12 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
            Déposer un certificat
          </Link>
        )}
      </div>
      <div className="flex min-h-28 items-center gap-2 overflow-hidden rounded-2xl bg-info-bg 2xl:w-[24rem] 2xl:shrink-0">
        <CertificateIllustration />
        <p className="py-4 pr-5 text-base leading-relaxed text-info-text">Chaque diplôme validé peut vous ouvrir de nouveaux postes.</p>
      </div>
    </section>
  )
}

/** CA-02 : le niveau d'études établi par les certificats validés. */
export function ValidatedLevel({ level }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex items-center gap-4 p-5`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-status-done-bg text-status-done-text" aria-hidden="true">
        <span className="material-symbols-outlined">workspace_premium</span>
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 id={titleId} className="text-sm font-semibold text-help">
          Niveau d'études validé
        </h3>
        <span className="text-xl font-bold text-primary-active">{level ?? "Aucun pour l'instant"}</span>
        <span className="text-help">Établi par vos certificats validés par les RH</span>
      </div>
    </section>
  )
}

const IN_REVIEW = ['RECEIVED', 'IN_REVIEW']

/** CA-03 : un certificat remplacé n'apparaît que dans « Tous ». */
export const FILTERS = [
  { key: 'all', label: 'Tous', keep: () => true },
  { key: 'validated', label: 'Validés', keep: (c) => !c.is_archived && c.status === 'VALIDATED' },
  { key: 'review', label: 'En cours d’examen', keep: (c) => !c.is_archived && IN_REVIEW.includes(c.status) },
  { key: 'correct', label: 'À corriger', keep: (c) => !c.is_archived && c.status === 'TO_CORRECT' },
]

export function Filters({ certificates, active, onChange }) {
  return (
    <div role="group" aria-label="Filtrer mes certificats" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const pressed = filter.key === active
        return (
          <button
            key={filter.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(filter.key)}
            className={`min-h-11 rounded-full border px-4 font-semibold ${
              pressed ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-heading hover:bg-section'
            }`}
          >
            {`${filter.label} · ${certificates.filter(filter.keep).length}`}
          </button>
        )
      })}
    </div>
  )
}

const TONES = {
  archived: { circle: 'bg-section text-help', icon: 'archive' },
  VALIDATED: { circle: 'bg-status-done-bg text-status-done-text', icon: 'verified' },
  TO_CORRECT: { circle: 'bg-error-bg text-error-text', icon: 'edit_document' },
  review: { circle: 'bg-status-progress-bg text-status-progress-text', icon: 'hourglass_top' },
}

const toneOf = (certificate) =>
  certificate.is_archived ? TONES.archived : TONES[certificate.status] ?? TONES.review

/** CA-04 : Reçu → En cours d'examen → Décision. */
function Progress({ status }) {
  const current = status === 'IN_REVIEW' ? 1 : 0
  return (
    <ol aria-label="Avancement" className="flex items-center gap-2">
      {['Reçu', 'En cours d’examen', 'Décision'].map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={`flex flex-1 flex-col gap-1.5 text-sm ${index <= current ? 'font-semibold text-heading' : 'text-help'}`}
        >
          <span className={`h-1.5 rounded-full ${index <= current ? 'bg-status-progress-dot' : 'bg-section'}`} aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}

/** CA-05 : le motif choisi par les RH et leur commentaire (« Autre » n'apporte rien : seul le commentaire est montré). */
export function hrMessage(certificate) {
  const reason = certificate.rejection_reason === 'Autre' ? null : certificate.rejection_reason
  return [reason, certificate.rejection_comment].filter(Boolean).join('. ')
}

function FileLink({ certificate }) {
  return (
    <a
      href={certificateFileUrl(certificate.id)}
      target="_blank"
      rel="noopener"
      aria-label={`Voir le fichier de ${certificate.title}`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 font-semibold text-primary hover:underline"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">visibility</span>
      Voir le fichier
    </a>
  )
}

function CertificateCard({ certificate }) {
  const tone = toneOf(certificate)
  const meta = [certificate.type_label, certificate.level_label, certificate.domain_label, certificate.year].filter(Boolean)
  const reviewing = !certificate.is_archived && IN_REVIEW.includes(certificate.status)
  const correcting = !certificate.is_archived && certificate.status === 'TO_CORRECT'
  const message = correcting && hrMessage(certificate)
  return (
    <li className={`${CARD} flex flex-col gap-4 p-4 lg:p-5`}>
      <div className="flex flex-wrap items-start gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone.circle}`} aria-hidden="true">
          <span className="material-symbols-outlined">{tone.icon}</span>
        </span>
        <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1">
          <h3 className="text-lg font-bold break-words text-heading">{certificate.title}</h3>
          <span className="text-help">
            {meta.join(' · ')} · déposé le {shortDate(certificate.submitted_at)}
          </span>
        </div>
        {certificate.is_archived ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-section px-2.5 py-0.5 text-xs font-semibold text-help">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">archive</span>
            Archivé (remplacé)
          </span>
        ) : (
          <CertificateStatus status={certificate.status} />
        )}
      </div>

      {certificate.is_archived && (
        <p className="text-help">Ce certificat a été remplacé mais reste conservé comme preuve dans votre dossier RH.</p>
      )}
      {message && (
        <p className="rounded-lg bg-error-bg p-3 leading-relaxed text-error-text">
          <strong>Message des RH :</strong> {message}
        </p>
      )}
      {reviewing && (
        <>
          <Progress status={certificate.status} />
          {certificate.answer_by && (
            <p className="text-help">Réponse des RH sous 5 jours ouvrables, au plus tard le {dayMonth(certificate.answer_by)}.</p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {certificate.status === 'VALIDATED' && !certificate.is_archived && certificate.decided_at ? (
          <span className="font-semibold text-status-done-text">Validé par les RH le {shortDate(certificate.decided_at)}</span>
        ) : (
          <span />
        )}
        <span className="flex flex-wrap items-center gap-3">
          <FileLink certificate={certificate} />
          {correcting && (
            <Link
              to={`${DEPOSIT_PATH}?remplace=${encodeURIComponent(certificate.id)}`}
              className="flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
            >
              Corriger et renvoyer
            </Link>
          )}
        </span>
      </div>
    </li>
  )
}

export function CertificateCards({ certificates }) {
  if (certificates.length === 0) {
    return <p className={`${CARD} p-4 text-help`}>Aucun certificat dans ce filtre.</p>
  }
  return (
    <ul aria-label="Certificats déposés" className="flex flex-col gap-3">
      {certificates.map((certificate) => (
        <CertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </ul>
  )
}

function HelpCard({ title, children, tinted = false }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-3 rounded-xl p-5 ${tinted ? 'bg-info-bg' : `${CARD}`}`}>
      <h3 id={titleId} className="text-lg font-bold text-primary-active">
        {title}
      </h3>
      {children}
    </section>
  )
}

const STEPS = [
  ['Vous déposez', 'Une photo ou un PDF, depuis votre téléphone'],
  ['Les RH vérifient', 'En 5 jours ouvrables au plus'],
  ['Il compte pour vous', 'Votre niveau est mis à jour et de nouveaux postes peuvent s’ouvrir'],
]

/** CA-07 : comment ça marche, les fichiers acceptés, à qui poser une question. */
export function CertificatesHelp({ maxMb }) {
  return (
    <>
      <HelpCard title="Comment ça marche">
        <ol className="flex flex-col gap-3">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-active">
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold text-heading">{title}</span>
                <span className="text-help">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </HelpCard>
      <HelpCard title="Fichiers acceptés">
        <p className="leading-relaxed text-help">
          PDF, JPG ou PNG{maxMb ? `, ${maxMb} Mo au plus` : ''}. Une photo nette, à plat, bien éclairée.
        </p>
      </HelpCard>
      <HelpCard title="Une question sur vos documents ?" tinted>
        <p className="leading-relaxed text-help">Adressez-vous au service RH de votre agence.</p>
      </HelpCard>
    </>
  )
}
