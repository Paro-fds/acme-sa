import { useState } from 'react'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { Filters, NotificationList, markAllRead, useNotifications } from './notificationParts.jsx'

const STEP = 50

/** US-116 : toutes les notifications du compte (90 derniers jours), par jour, avec les filtres. */
export default function NotificationsPage() {
  const [kind, setKind] = useState(null)
  const [limit, setLimit] = useState(STEP)
  const { data, error, reload } = useNotifications({ kind, limit })

  const markAll = (
    <button
      type="button"
      onClick={() => markAllRead(reload)}
      disabled={!data?.unread_count}
      className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary hover:bg-rh-hover disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-lg" aria-hidden="true">done_all</span>
      Tout marquer comme lu
    </button>
  )

  return (
    <Page account="admin" title="Notifications" subtitle="Les 90 derniers jours." headerActions={markAll}>
      <Filters
        value={kind}
        onChange={(next) => {
          setKind(next)
          setLimit(STEP)
        }}
      />
      {error && <Alert>{error.message}</Alert>}
      {!data && !error && <p role="status">Chargement…</p>}
      {data && data.items.length === 0 && (
        <p className="rounded-xl bg-surface p-4 text-base text-rh-strong shadow-card">Aucune notification pour le moment.</p>
      )}
      {data && data.items.length > 0 && (
        <div className="rounded-xl border border-rh-line bg-surface p-2 shadow-card">
          <NotificationList items={data.items} />
        </div>
      )}
      {data?.has_more && (
        <button
          type="button"
          onClick={() => setLimit(limit + STEP)}
          className="min-h-11 self-center rounded-lg border border-rh-line bg-surface px-5 font-semibold text-primary hover:bg-rh-hover"
        >
          Afficher plus
        </button>
      )}
    </Page>
  )
}
