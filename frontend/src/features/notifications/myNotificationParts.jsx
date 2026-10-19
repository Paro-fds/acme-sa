import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getMyNotifications, markMyNotificationRead } from '../../api/notifications.js'
import { formatWhen } from '../admin/notifications/notificationParts.jsx'

export const MY_NOTIFICATIONS_PATH = '/notifications'

/** Icône et couleurs de chaque notification, toujours avec son libellé (jamais la couleur seule). */
const KINDS = {
  OPENING: { icon: 'work', classes: 'bg-info-bg text-info-text' },
  CERTIFICATE_VALIDATED: { icon: 'verified', classes: 'bg-status-done-bg text-status-done-text' },
  CERTIFICATE_TO_CORRECT: { icon: 'edit_note', classes: 'bg-status-progress-bg text-status-progress-text' },
}

/**
 * US-120 : charge les notifications de l'employé ; `reload` après une lecture ou « Tout marquer comme lu ».
 * Une erreur (hors connexion, session expirée) laisse simplement la cloche sans pastille.
 */
export function useMyNotifications({ limit = 50 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(
    () =>
      Promise.resolve()
        .then(() => getMyNotifications({ limit }))
        .then((result) => {
          setData(result)
          setError(null)
        })
        .catch((caught) => setError(caught)),
    [limit],
  )
  useEffect(() => {
    load()
  }, [load])
  return { data, error, reload: load }
}

/** Ouvre une notification : elle devient lue, puis mène à sa page. */
export function useOpenNotification(onOpen) {
  const navigate = useNavigate()
  return (item) => (event) => {
    event.preventDefault()
    markMyNotificationRead(item.key).catch(() => {})
    onOpen?.()
    navigate(item.link)
  }
}

function MyNotificationItem({ item, onOpen }) {
  const open = useOpenNotification(onOpen)
  const { icon, classes } = KINDS[item.kind] ?? KINDS.OPENING
  return (
    <li>
      <Link
        to={item.link}
        onClick={open(item)}
        className={`flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-section ${item.unread ? 'bg-info-bg/60' : ''}`}
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${classes}`} aria-hidden="true">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`text-base leading-snug break-words text-heading ${item.unread ? 'font-bold' : 'font-medium'}`}>
            {item.title}
          </span>
          <span className="text-sm break-words text-body">{item.detail}</span>
          <span className="text-sm text-help">
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

export function MyNotificationList({ items, onOpen }) {
  return (
    <ul aria-label="Mes notifications" className="flex flex-col gap-1">
      {items.map((item) => (
        <MyNotificationItem key={item.key} item={item} onOpen={onOpen} />
      ))}
    </ul>
  )
}
