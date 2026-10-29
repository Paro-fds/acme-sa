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

/** D'où vient l'élément : l'employé sait ce qu'il peut corriger, et où. */
const SOURCES = {
  HR: { label: 'Système RH', icon: 'lock', classes: 'bg-status-neutral-bg text-status-neutral-text' },
  VALIDATED: { label: 'Validé par les RH', icon: 'check_circle', classes: 'bg-status-done-bg text-status-done-text' },
  IN_REVIEW: { label: 'En cours d’examen', icon: 'schedule', classes: 'bg-status-progress-bg text-status-progress-text' },
  DECLARED: { label: 'Déclaré par vous', icon: null, classes: 'bg-status-neutral-bg text-status-neutral-text' },
}

/** US-131 : une ligne de la frise, la date à gauche, un point sur la ligne, le contenu à droite. */
function Row({ date, dot, highlight = false, children }) {
  return (
    <li className="grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] gap-2 pb-4 lg:grid-cols-[5.5rem_1.5rem_minmax(0,1fr)] lg:gap-3">
      <span data-date className={`pt-3 text-right text-sm font-semibold ${highlight ? 'text-primary' : 'text-help'}`}>
        {date}
      </span>
      <span className="relative flex justify-center pt-3.5" aria-hidden="true">
        <span className={`relative z-10 size-4 rounded-full border-[3px] border-surface ${dot}`} />
      </span>
      {children}
    </li>
  )
}

/** « Aujourd'hui » : le poste, l'agence et l'ancienneté (US-114 CA-01), en tête de la frise. */
function TodayRow({ today }) {
  return (
    <Row date="Aujourd’hui" dot="bg-primary ring-4 ring-primary-soft" highlight>
      <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-primary px-4 py-3 text-white shadow-card">
        <span className="text-lg font-bold break-words">{today.position}</span>
        <span className="text-sm opacity-90">{[today.agency, today.seniority].filter(Boolean).join(' · ')}</span>
      </div>
    </Row>
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

const DOTS = {
  ACME: 'bg-primary',
  QUALIFICATION: 'bg-status-done-dot',
  TRAINING: 'bg-accent-icon',
  EXPERIENCE: 'bg-status-progress-dot',
}

function TimelineEvent({ event }) {
  const titleId = useId()
  const scope = event.group === 'ACME' ? 'Chez ACME' : 'Hors ACME'
  return (
    <Row date={event.dateLabel} dot={DOTS[event.group]}>
      <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
        <h3 id={titleId} className="text-base font-bold break-words text-heading lg:text-lg">
          {event.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-help">{[scope, event.kindLabel].filter(Boolean).join(' · ')}</span>
          <SourceChip source={event.source} />
        </div>
        {event.detail && <p className="text-sm text-help">{event.detail}</p>}
        {event.description && <p className="text-sm whitespace-pre-line text-help">{event.description}</p>}
      </article>
    </Row>
  )
}

function Frise({ today, events }) {
  return (
    <ol aria-label="Mon parcours, du plus récent au plus ancien" className="relative flex flex-col">
      <span className="absolute top-4 bottom-6 left-[calc(4.5rem+1.25rem)] w-0.5 bg-border lg:left-[calc(5.5rem+1.5rem)]" aria-hidden="true" />
      {today && <TodayRow today={today} />}
      {events.map((event) => (
        <TimelineEvent key={event.id} event={event} />
      ))}
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
 * US-114, US-131 : la frise du parcours, « Aujourd'hui » en tête (entrée chez ACME SA, certificats, parcours déjà saisi),
 * du plus récent au plus ancien, avec des filtres. Se charge à part : une erreur ici n'empêche pas d'afficher les postes.
 */
export default function CareerTimeline() {
  const { data, error, loading } = useLoader(load)
  const [filter, setFilter] = useState('ALL')
  const titleId = useId()

  if (loading && !data) return <p role="status">Chargement de votre parcours…</p>
  if (error) return <Alert>{error.message}</Alert>

  const visible = filterEvents(data.events, filter)
  const showToday = (filter === 'ALL' || filter === 'ACME') && Boolean(data.today.position)
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={titleId} className="text-xl font-bold text-primary-active">
            Mon parcours
          </h2>
          {data.events.length > 0 && <Filters filters={visibleFilters(data.events)} value={filter} onChange={setFilter} />}
        </div>
        {data.events.length === 0 ? (
          <>
            {data.today.position && <Frise today={data.today} events={[]} />}
            <EmptyInvite />
          </>
        ) : visible.length > 0 || showToday ? (
          <Frise today={showToday ? data.today : null} events={visible} />
        ) : (
          <p className="text-help">Rien dans cette catégorie pour le moment.</p>
        )}
        {data.skills.length > 0 && <Skills skills={data.skills} />}
        <p className="text-sm text-help">{VISIBILITY_NOTICE}</p>
    </section>
  )
}
