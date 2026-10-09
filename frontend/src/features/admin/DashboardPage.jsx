import { Link } from 'react-router'
import { getStatistics } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import EngagementCard from './EngagementCard.jsx'
import { useLoader } from '../../lib/useLoader.js'

const LIST = '/admin/employes'

/** Cartes du tableau de bord ; chacune ouvre la liste filtrée correspondante (US-19). */
const CARDS = [
  { key: 'total', label: 'Total', help: 'employés actifs', icon: 'groups', to: LIST, tone: 'bg-info-bg text-info-text' },
  {
    key: 'updated',
    label: 'Effectuées',
    help: 'mises à jour soumises',
    icon: 'check_circle',
    to: `${LIST}?status=UPDATED`,
    tone: 'bg-status-done-bg text-status-done-text',
  },
  {
    key: 'not_updated',
    label: 'Non effectuées',
    help: 'restent à faire',
    icon: 'pending',
    to: `${LIST}?status=NOT_UPDATED`,
    tone: 'bg-status-neutral-bg text-status-neutral-text',
  },
]

function StatCard({ label, help, icon, to, tone, value }) {
  return (
    <Link
      to={to}
      aria-label={`${label} : ${value}, ${help}`}
      className="flex min-h-11 items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-card hover:border-primary"
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-heading">{label}</span>
        <span className="text-sm text-help">{help}</span>
      </span>
      <span className="text-[28px] leading-8 font-bold text-heading">{value}</span>
      <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
    </Link>
  )
}

function ProgressCard({ progress, updated, total }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">Avancement</h3>
        <p className="font-semibold text-heading">{progress} % de la campagne</p>
      </div>
      <div
        role="progressbar"
        aria-label="Avancement de la campagne"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-3 overflow-hidden rounded-full bg-status-neutral-bg"
      >
        <div className="h-full rounded-full bg-status-done-dot" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-help">
        {updated} sur {total} employés ont effectué leur mise à jour.
      </p>
    </section>
  )
}

/** US-16 : tableau de bord de la campagne (lecture seule). */
export default function DashboardPage() {
  const { data, error, loading, reload } = useLoader(getStatistics, { loginPath: '/admin/connexion' })

  if (loading) return <Page account="admin" title="Tableau de bord"><p role="status">Chargement…</p></Page>
  if (error) return <Page account="admin" title="Tableau de bord"><Alert>{error.message}</Alert></Page>

  return (
    <Page account="admin" title="Tableau de bord">
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] leading-8 font-bold">Suivi de la campagne</h2>
        <p className="text-help">Mise à jour des dossiers des employés.</p>
      </div>

      <ProgressCard progress={data.progress} updated={data.updated} total={data.total} />

      <div className="flex flex-col gap-3">
        {CARDS.map(({ key, ...card }) => (
          <StatCard key={key} {...card} value={data[key]} />
        ))}
      </div>

      <EngagementCard />

      <div className="flex flex-col gap-3 md:flex-row">
        <Link
          to={LIST}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
        >
          <span className="material-symbols-outlined" aria-hidden="true">list</span>
          Voir la liste des employés
        </Link>
        <Button variant="secondary" onClick={() => reload()}>
          <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
          Actualiser
        </Button>
      </div>
    </Page>
  )
}
