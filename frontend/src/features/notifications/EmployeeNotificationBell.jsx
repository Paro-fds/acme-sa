import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { bellLabel } from '../admin/notifications/notificationParts.jsx'
import { MY_NOTIFICATIONS_PATH, MyNotificationList, useMyNotifications } from './myNotificationParts.jsx'

const PANEL_LIMIT = 8
const BELL = 'relative flex size-11 shrink-0 items-center justify-center rounded-full text-heading hover:bg-canvas'

function BellIcon({ count }) {
  return (
    <>
      <span className="material-symbols-outlined text-[26px]" aria-hidden="true">notifications</span>
      {count > 0 && (
        <span
          className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-error-dot px-1 text-xs font-bold text-white tabular-nums"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  )
}

/**
 * US-120 CA-01 : cloche de l'espace employé et nombre de non lues. Sur ordinateur (barre du haut, US-127), elle ouvre la
 * liste des dernières notifications ; sur téléphone (en-tête), elle mène à la page Notifications.
 */
export default function EmployeeNotificationBell() {
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const { data, reload } = useMyNotifications({ limit: PANEL_LIMIT })
  const containerRef = useRef(null)
  const count = data?.unread_count ?? 0

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('mousedown', close)
    }
  }, [open])

  if (!desktop) {
    return (
      <Link to={MY_NOTIFICATIONS_PATH} aria-label={bellLabel(count)} className={BELL}>
        <BellIcon count={count} />
      </Link>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={bellLabel(count)}
        aria-expanded={open}
        onClick={() => {
          if (!open) reload()
          setOpen(!open)
        }}
        className={`${BELL} ${open ? 'bg-info-bg' : ''}`}
      >
        <BellIcon count={count} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-full right-0 z-40 mt-2 flex max-h-[min(36rem,80vh)] w-[24rem] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface px-2 pt-4 pb-2 shadow-modal"
        >
          <h2 className="px-3 text-lg font-bold text-heading">Notifications</h2>
          {data && data.items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-help">Aucune notification pour le moment.</p>
          )}
          {data && data.items.length > 0 && <MyNotificationList items={data.items} onOpen={() => setOpen(false)} />}
          <Link
            to={MY_NOTIFICATIONS_PATH}
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center justify-center border-t border-border text-sm font-semibold text-primary hover:underline"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}
