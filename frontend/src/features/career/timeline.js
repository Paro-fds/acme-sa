import { formatDate, formatMonth } from '../../lib/format.js'

/**
 * US-114 : frise de « Ma carrière », construite à partir de ce que le portail connaît déjà :
 * la date d'embauche (système RH), les certificats déposés et le parcours déjà saisi (US-25).
 * Le portail ne connaît pas les anciens postes chez ACME SA : seule l'entrée y figure.
 */

export const TIMELINE_FILTERS = [
  { id: 'ALL', label: 'Tout' },
  { id: 'ACME', label: 'Chez ACME' },
  { id: 'QUALIFICATION', label: 'Hors ACME' },
  { id: 'TRAINING', label: 'Formations', onlyIfFilled: true },
  { id: 'EXPERIENCE', label: 'Expériences', onlyIfFilled: true },
]

/**
 * Formations et expériences ne se saisissent plus depuis le retrait de l'ancien parcours (US-114) ; leur écran
 * viendra avec US-803. D'ici là, leur filtre n'apparaît que si l'employé en avait déjà saisi.
 */
export function visibleFilters(events) {
  return TIMELINE_FILTERS.filter((filter) => !filter.onlyIfFilled || events.some((event) => event.group === filter.id))
}

/** Certificats qui comptent dans la frise : un certificat à corriger ou remplacé (archivé) n'y figure pas. */
const CERTIFICATE_SOURCES = { VALIDATED: 'VALIDATED', RECEIVED: 'IN_REVIEW', IN_REVIEW: 'IN_REVIEW' }

const join = (separator, ...parts) => parts.filter(Boolean).join(separator)

/** Années complètes entre la date d'embauche et aujourd'hui → « 8 ans chez ACME SA ». */
export function seniorityLabel(hireDate, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(hireDate ?? '')
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  let years = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) years -= 1
  if (years < 1) return 'Moins d’un an chez ACME SA'
  return `${years} an${years > 1 ? 's' : ''} chez ACME SA`
}

/** Période d'une formation ou d'une expérience : « janv. 2016 → août 2018 », ou « depuis juin 2024 ». */
function period(entry) {
  if (!entry.end_month) return `depuis ${formatMonth(entry.start_month)}`
  if (entry.end_month === entry.start_month) return formatMonth(entry.start_month)
  return `${formatMonth(entry.start_month, { short: true })} → ${formatMonth(entry.end_month, { short: true })}`
}

function hireEvent(hireDate) {
  return {
    id: 'acme-hire',
    group: 'ACME',
    key: hireDate.slice(0, 7),
    title: 'Entrée chez ACME SA',
    when: formatMonth(hireDate.slice(0, 7)),
    detail: `Embauche le ${formatDate(hireDate)}`,
    source: 'HR',
  }
}

function certificateEvent(certificate) {
  return {
    id: `certificate-${certificate.id}`,
    group: 'QUALIFICATION',
    key: `${certificate.year}-00`,
    title: certificate.title,
    when: `obtenu en ${certificate.year}`,
    detail: join(' · ', certificate.type_label, certificate.institution),
    source: CERTIFICATE_SOURCES[certificate.status],
  }
}

function careerEvent(entry) {
  const event = { id: `career-${entry.id}`, group: entry.kind, key: entry.start_month ?? '', title: entry.title, source: 'DECLARED' }
  switch (entry.kind) {
    case 'QUALIFICATION':
      return { ...event, when: formatMonth(entry.start_month), detail: join(' · ', entry.qualification_type_label, entry.organization) }
    case 'TRAINING':
      return { ...event, when: period(entry), detail: join(' · ', entry.organization, entry.duration_hours ? `${entry.duration_hours} h` : null) }
    default:
      return {
        ...event,
        when: period(entry),
        detail: join(', ', entry.organization, entry.location),
        description: entry.description,
      }
  }
}

/** `{ today, events, skills }` : events du plus récent au plus ancien, chacun avec son année (`year`, null sans date). */
export function buildTimeline({ profile, career, certificates }, now = new Date()) {
  const items = career.kinds.flatMap((kind) => kind.items)
  const events = [
    ...(profile.hire_date ? [hireEvent(profile.hire_date)] : []),
    ...certificates.certificates
      .filter((certificate) => !certificate.is_archived && CERTIFICATE_SOURCES[certificate.status])
      .map(certificateEvent),
    ...items.filter((entry) => entry.kind !== 'SKILL').map(careerEvent),
  ]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((event) => ({ ...event, year: event.key.slice(0, 4) || null }))

  return {
    today: {
      position: profile.position,
      agency: profile.affectation?.agency ?? null,
      seniority: seniorityLabel(profile.hire_date, now),
    },
    events,
    skills: items
      .filter((entry) => entry.kind === 'SKILL')
      .map((entry) => ({ id: entry.id, title: entry.title, level: entry.skill_level_label })),
  }
}

export function filterEvents(events, filter) {
  return filter === 'ALL' ? events : events.filter((event) => event.group === filter)
}
