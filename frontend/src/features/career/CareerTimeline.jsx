import { useId, useState } from 'react'
import { Link } from 'react-router'
import { getMyCareer } from '../../api/career.js'
import { listCertificates } from '../../api/certificates.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { buildTimeline, filterEvents, visibleFilters } from './timeline.js'

/** D-17 : l'employé sait que son parcours sert à le contacter pour des opportunités internes. */
export const VISIBILITY_NOTICE =
  'Votre parcours est visible par l’administration d’ACME SA, qui peut vous contacter pour des opportunités internes.'

async function load() {
  const [profile, career, certificates] = await Promise.all([getProfile(), getMyCareer(), listCertificates()])
  return buildTimeline({ profile, career, certificates })
}

/** Icône et couleurs de chaque type d'élément. */
const GROUPS = {
  ACME: { label: 'Chez ACME', icon: 'apartment', dot: 'bg-info-bg text-info-text', text: 'text-info-text' },
  QUALIFICATION: { label: 'Diplôme', icon: 'school', dot: 'bg-status-done-bg text-status-done-text', text: 'text-status-done-text' },
  TRAINING: { label: 'Formation', icon: 'model_training', dot: 'bg-accent-bg text-accent-text', text: 'text-accent-text' },
  EXPERIENCE: { label: 'Expérience', icon: 'work_history', dot: 'bg-status-progress-bg text-status-progress-text', text: 'text-status-progress-text' },
}

/** D'où vient l'élément : l'employé sait ce qu'il peut corriger, et où. */
const SOURCES = {
  HR: { label: 'Système RH', icon: 'lock', classes: 'bg-status-neutral-bg text-status-neutral-text' },
  VALIDATED: { label: 'Validé par les RH', icon: 'check_circle', classes: 'bg-status-done-bg text-status-done-text' },
  IN_REVIEW: { label: 'En cours d’examen', icon: 'schedule', classes: 'bg-status-progress-bg text-status-progress-text' },
  DECLARED: { label: 'Déclaré par vous', icon: null, classes: 'bg-status-neutral-bg text-status-neutral-text' },
}

function TodayBanner({ today }) {
  return (
    <section aria-label="Aujourd’hui" className="flex items-center gap-4 rounded-xl bg-primary p-4 text-white shadow-card lg:p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
        <span className="material-symbols-outlined">flag</span>
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-semibold tracking-wide uppercase opacity-80">Aujourd’hui</p>
        <p className="text-lg font-bold break-words lg:text-xl">{[today.position, today.agency].filter(Boolean).join(' · ')}</p>
        {today.seniority && <p className="text-sm opacity-85">{today.seniority}</p>}
      </div>
    </section>
  )
}

function SourceChip({ source }) {
  const { label, icon, classes } = SOURCES[source]
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${classes}`}>
      {icon && <span className="material-symbols-outlined text-base" aria-hidden="true">{icon}</span>}
      {label}
    </span>
  )
}

function TimelineEvent({ event }) {
  const titleId = useId()
  const group = GROUPS[event.group]
  return (
    <li className="relative flex gap-3 pb-4 lg:gap-4">
      <span
        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-canvas ${group.dot}`}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-xl">{group.icon}</span>
      </span>
      <article aria-labelledby={titleId} className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className={`font-semibold tracking-wide uppercase ${group.text}`}>{group.label}</span>
            {event.when && <span className="text-help"> · {event.when}</span>}
          </p>
          <SourceChip source={event.source} />
        </div>
        <h3 id={titleId} className="text-lg font-bold break-words text-heading">
          {event.title}
        </h3>
        {event.detail && <p className="text-sm text-help">{event.detail}</p>}
        {event.description && <p className="text-sm whitespace-pre-line text-help">{event.description}</p>}
      </article>
    </li>
  )
}

function YearMarker({ year }) {
  return (
    <li className="relative z-10 flex pb-3">
      <span className="min-w-10 rounded-full bg-heading px-2 py-0.5 text-center text-sm font-bold text-white">{year ?? 'Sans date'}</span>
    </li>
  )
}

function Frise({ events }) {
  const rows = []
  let lastYear
  for (const event of events) {
    if (event.year !== lastYear) {
      rows.push(<YearMarker key={`year-${event.year}`} year={event.year} />)
      lastYear = event.year
    }
    rows.push(<TimelineEvent key={event.id} event={event} />)
  }
  return (
    <ol aria-label="Mon parcours, du plus récent au plus ancien" className="relative flex flex-col">
      <span className="absolute top-2 bottom-6 left-[19px] w-0.5 bg-border" aria-hidden="true" />
      {rows}
    </ol>
  )
}

function Filters({ filters, value, onChange }) {
  return (
    <div role="group" aria-label="Filtrer la frise" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap">
      {filters.map((filter) => {
        const on = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(filter.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap ${
              on ? 'border-heading bg-heading text-white' : 'border-border bg-surface text-heading hover:bg-canvas'
            }`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

function Skills({ skills }) {
  const titleId = useId()
  return (
    <div className="flex flex-col gap-2">
      <h3 id={titleId} className="font-semibold text-heading">Compétences</h3>
      <ul aria-labelledby={titleId} className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li key={skill.id} className="flex min-h-11 items-center gap-2 rounded-full border border-info-border bg-info-bg py-1 pr-1 pl-4">
            <span className="font-semibold text-heading">{skill.title}</span>
            {skill.level && <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold text-info-text">{skill.level}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyInvite() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-input bg-surface p-4">
      <p className="text-base text-heading">
        Votre parcours se construit avec vos certificats : chaque diplôme ou attestation déposé y prend sa place.
      </p>
      <Link
        to="/certificats/deposer"
        className="flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-info-bg"
      >
        <span className="material-symbols-outlined" aria-hidden="true">upload</span>
        Déposer un certificat
      </Link>
    </div>
  )
}

/**
 * US-114 : « Aujourd'hui » puis la frise du parcours (entrée chez ACME SA, certificats, parcours déjà saisi),
 * du plus récent au plus ancien, avec des filtres. Se charge à part : une erreur ici n'empêche pas d'afficher les postes.
 */
export default function CareerTimeline() {
  const { data, error, loading } = useLoader(load)
  const [filter, setFilter] = useState('ALL')
  const titleId = useId()

  if (loading && !data) return <p role="status">Chargement de votre parcours…</p>
  if (error) return <Alert>{error.message}</Alert>

  const visible = filterEvents(data.events, filter)
  return (
    <>
      <TodayBanner today={data.today} />
      <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl bg-section p-4 lg:p-5">
        <h2 id={titleId} className="text-xl font-bold text-primary-active">
          Mon parcours
        </h2>
        {data.events.length === 0 ? (
          <EmptyInvite />
        ) : (
          <>
            <Filters filters={visibleFilters(data.events)} value={filter} onChange={setFilter} />
            {visible.length > 0 ? (
              <Frise events={visible} />
            ) : (
              <p className="text-help">Rien dans cette catégorie pour le moment.</p>
            )}
          </>
        )}
        {data.skills.length > 0 && <Skills skills={data.skills} />}
        <p className="text-sm text-help">{VISIBILITY_NOTICE}</p>
      </section>
    </>
  )
}
