import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Alert from '../../../components/Alert.jsx'
import { useIsDesktop } from '../../../lib/useIsDesktop.js'
import { Filters, NOTIFICATIONS_PATH, NotificationList, bellLabel, markAllRead, useNotifications } from './notificationParts.jsx'

const PANEL_LIMIT = 8

function BellIcon({ count }) {
  return (
    <>
      <span className="material-symbols-outlined text-[26px]" aria-hidden="true">notifications</span>
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-primary bg-error-dot px-1 text-xs font-bold text-white tabular-nums"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  )
}

const BELL = 'relative flex size-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-surface/10'

/**
 * US-116 CA-01 : cloche de l'en-tête et nombre de non lues. Sur ordinateur, elle ouvre la liste des dernières
 * notifications ; sur téléphone, elle mène à la page Notifications.
 */
export default function NotificationBell() {
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(null)
  const { data, error, reload } = useNotifications({ kind, limit: PANEL_LIMIT })
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
      <Link to={NOTIFICATIONS_PATH} aria-label={bellLabel(count)} className={BELL}>
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
        className={`${BELL} ${open ? 'bg-surface/15' : ''}`}
      >
        <BellIcon count={count} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 flex max-h-[min(36rem,80vh)] w-[26rem] flex-col gap-2 overflow-y-auto rounded-xl border border-rh-line bg-surface px-2 pt-4 pb-2 text-rh-strong shadow-modal"
        >
          <div className="flex items-center justify-between gap-2 px-2">
            <h2 className="text-lg font-bold">Notifications</h2>
            <button
              type="button"
              onClick={() => markAllRead(reload)}
              disabled={count === 0}
              className="flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary hover:bg-rh-hover disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">done_all</span>
              Tout marquer comme lu
            </button>
          </div>
          <div className="px-2">
            <Filters value={kind} onChange={setKind} />
          </div>
          {error && <Alert>{error.message}</Alert>}
          {data && data.items.length === 0 && <p className="px-3 py-6 text-center text-sm text-rh-muted">Aucune notification.</p>}
          {data && data.items.length > 0 && <NotificationList items={data.items} onOpen={() => setOpen(false)} />}
          <Link
            to={NOTIFICATIONS_PATH}
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center justify-center border-t border-rh-line text-sm font-semibold text-primary hover:underline"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  )
}
