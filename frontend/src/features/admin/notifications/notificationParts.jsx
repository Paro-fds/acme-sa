import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../../api/notifications.js'

export const NOTIFICATIONS_PATH = '/admin/notifications'

export const FILTERS = [
  { kind: null, label: 'Tout' },
  { kind: 'CERTIFICATE_SUBMITTED', label: 'Certificats' },
  { kind: 'CERTIFICATE_LATE', label: 'Retards' },
  { kind: 'ERROR_REPORTED', label: 'Signalements' },
  { kind: 'APPLICATION_RECEIVED', label: 'Candidatures' },
]

/** Icône et couleurs de chaque notification, toujours avec son libellé (jamais la couleur seule). */
const KINDS = {
  CERTIFICATE_SUBMITTED: { icon: 'upload_file', classes: 'bg-info-bg text-info-text' },
  CERTIFICATE_LATE: { icon: 'schedule', classes: 'bg-status-progress-bg text-status-progress-text' },
  ERROR_REPORTED: { icon: 'flag', classes: 'bg-error-bg text-error-text' },
  APPLICATION_RECEIVED: { icon: 'send', classes: 'bg-status-done-bg text-status-done-text' },
}

const pad = (value) => String(value).padStart(2, '0')
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const time = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

function yesterdayOf(now) {
  const day = new Date(now)
  day.setDate(day.getDate() - 1)
  return day
}

/** « à l’instant », « il y a 10 min », « il y a 3 h », « hier à 16:20 », puis « 05/10/2026 à 08:00 » (heure du poste). */
export function formatWhen(iso, now = new Date()) {
  const date = new Date(iso)
  const minutes = Math.floor((now - date) / 60000)
  if (sameDay(date, now)) {
    if (minutes < 1) return 'à l’instant'
    if (minutes < 60) return `il y a ${minutes} min`
    return `il y a ${Math.floor(minutes / 60)} h`
  }
  if (sameDay(date, yesterdayOf(now))) return `hier à ${time(date)}`
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} à ${time(date)}`
}

function dayLabel(iso, now = new Date()) {
  const date = new Date(iso)
  if (sameDay(date, now)) return 'Aujourd’hui'
  if (sameDay(date, yesterdayOf(now))) return 'Hier'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function bellLabel(count) {
  if (!count) return 'Notifications, aucune non lue'
  return `Notifications, ${count} non lue${count > 1 ? 's' : ''}`
}

/** Charge les notifications ; `reload` après une lecture ou « Tout marquer comme lu ». */
export function useNotifications({ kind = null, limit = 50, enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    if (!enabled) return Promise.resolve()
    return getNotifications({ kind, limit })
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((caught) => setError(caught))
  }, [kind, limit, enabled])
  useEffect(() => {
    load()
  }, [load])
  return { data, error, reload: load }
}

export async function markAllRead(reload) {
  await markAllNotificationsRead()
  await reload()
}

export function Filters({ value, onChange }) {
  return (
    <div role="group" aria-label="Filtrer les notifications" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {FILTERS.map((filter) => {
        const on = filter.kind === value
        return (
          <button
            key={filter.label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(filter.kind)}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-sm font-semibold whitespace-nowrap ${
              on ? 'border-rh-strong bg-rh-strong text-white' : 'border-rh-line bg-surface text-rh-strong hover:bg-rh-hover'
            }`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

function NotificationItem({ item, onOpen }) {
  const navigate = useNavigate()
  const { icon, classes } = KINDS[item.kind] ?? KINDS.CERTIFICATE_SUBMITTED
  return (
    <li>
      <Link
        to={item.link}
        onClick={(event) => {
          event.preventDefault()
          markNotificationRead(item.key).catch(() => {})
          onOpen?.()
          navigate(item.link)
        }}
        className={`flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-rh-hover ${item.unread ? 'bg-info-bg/60' : ''}`}
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${classes}`} aria-hidden="true">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`text-base leading-snug break-words text-rh-strong ${item.unread ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
          <span className="text-sm break-words text-rh-text">{item.detail}</span>
          <span className="text-sm text-rh-muted">
            <span className="font-semibold">{item.kind_label}</span> · {formatWhen(item.at)}
          </span>
        </span>
        {item.unread && (
          <span className="mt-1.5 flex shrink-0 items-center">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="sr-only">Non lue</span>
          </span>
        )}
      </Link>
    </li>
  )
}

/** Les notifications groupées par jour : Aujourd’hui, Hier, puis la date. */
export function NotificationList({ items, onOpen }) {
  const groups = []
  for (const item of items) {
    const label = dayLabel(item.at)
    const last = groups.at(-1)
    if (last?.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-1">
          <h3 className="px-3 pt-1 text-xs font-semibold tracking-wider text-rh-muted uppercase">{group.label}</h3>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <NotificationItem key={item.key} item={item} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
