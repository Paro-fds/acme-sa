import { markAllMyNotificationsRead } from '../../api/notifications.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { MyNotificationList, useMyNotifications } from './myNotificationParts.jsx'

/** US-120 CA-05 : toutes les notifications de l'employé (90 jours), les plus récentes d'abord. */
export default function MyNotificationsPage() {
  const { data, error, reload } = useMyNotifications()
  const count = data?.unread_count ?? 0

  async function markAll() {
    await markAllMyNotificationsRead().catch(() => {})
    await reload()
  }

  return (
    <Page account title="Notifications">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[26px] leading-[34px] font-bold tracking-tight text-primary-active">Notifications</h2>
          <p className="text-help">Les postes ouverts pour vous et les décisions des RH sur vos certificats.</p>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={count === 0}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-base font-semibold text-primary hover:bg-info-bg disabled:opacity-50"
        >
          <span className="material-symbols-outlined" aria-hidden="true">done_all</span>
          Tout marquer comme lu
        </button>
      </div>
      {!data && !error && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {data && data.items.length === 0 && (
        <p className="rounded-xl bg-surface p-4 text-base text-heading shadow-card">Aucune notification pour le moment.</p>
      )}
      {data && data.items.length > 0 && (
        <div className="rounded-xl bg-surface p-2 shadow-card">
          <MyNotificationList items={data.items} />
        </div>
      )}
    </Page>
  )
}
