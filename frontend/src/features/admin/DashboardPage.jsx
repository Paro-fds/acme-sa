import { useState } from 'react'
import { getAdminMe, getEngagement, getPilotDashboard } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { AgencyChart, DashboardHero, KeyFigures, TodoList, WeeklyEngagement } from './dashboardParts.jsx'

const LOGIN_PATH = '/admin/connexion'

/** Le compte RH et l'engagement sont un plus : s'ils ne se chargent pas, le tableau de bord s'affiche quand même. */
async function load() {
  const [dashboard, me, engagement] = await Promise.all([
    getPilotDashboard(),
    getAdminMe().catch(() => null),
    getEngagement().catch(() => null),
  ])
  return { ...dashboard, me, engagement }
}

/**
 * US-601 (écran A02), US-132 (refonte du 2026-10-19) : bonjour et ce qui attend, quatre tuiles, dossiers complets par
 * agence, « À faire », engagement des employés ; le tableau « Par unité » en bas.
 */
export default function DashboardPage() {
  const [unitTab, setUnitTab] = useState('AGENCE') // 'AGENCE' | 'REGION' | 'DIRECTION'

  const { data, error, loading } = useLoader(load, { loginPath: LOGIN_PATH })

  if (loading) {
    return (
      <Page account="admin" wide title="Tableau de bord">
        <p role="status" className="p-8 text-center text-rh-muted">Chargement du tableau de bord…</p>
      </Page>
    )
  }

  if (error) {
    return (
      <Page account="admin" wide title="Tableau de bord">
        <Alert>{error.message}</Alert>
      </Page>
    )
  }

  const { kpi, to_process, by_agency, by_region, by_direction, me, engagement } = data
  const role = me?.role ?? null
  const firstName = me?.display_name?.split(' ')[0] ?? ''
  const agencies = by_agency.filter((agency) => agency.employees_count > 0 && agency.unit_code !== 'AUTRE')

  const currentUnits =
    unitTab === 'AGENCE' ? by_agency : unitTab === 'REGION' ? by_region : by_direction

  const totalEmployees = currentUnits.reduce((acc, u) => acc + u.employees_count, 0)
  const totalReceivedCerts = currentUnits.reduce((acc, u) => acc + u.received_certificates, 0)
  const totalWaitingCerts = currentUnits.reduce((acc, u) => acc + u.waiting_certificates, 0)
  const totalRejectedCerts = currentUnits.reduce((acc, u) => acc + u.rejected_certificates, 0)

  return (
    <Page account="admin" wide title="Tableau de bord">
      <div className="flex flex-col gap-6">
        <DashboardHero firstName={firstName} waiting={kpi.waiting_certificates} overdue={kpi.overdue_certificates} role={role} />
        <KeyFigures kpi={kpi} toProcess={to_process} agencies={agencies.length} role={role} />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <AgencyChart agencies={agencies} target={kpi.target_percent} />
          <aside aria-label="À faire et engagement" className="flex flex-col gap-6">
            <TodoList toProcess={to_process} role={role} />
            {engagement?.weekly_employees?.length > 0 && <WeeklyEngagement weekly={engagement.weekly_employees} />}
          </aside>
        </div>

        {/* Bloc Par unité */}
        <div className="bg-surface rounded-xl border border-rh-line p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rh-line pb-3">
            <h2 className="text-base font-semibold text-rh-strong">Par unité</h2>

            {/* Sélecteur à trois onglets Agence / Région / Direction */}
            <div className="inline-flex p-1 bg-rh-hover rounded-lg text-xs font-medium text-rh-text">
              <button
                type="button"
                onClick={() => setUnitTab('AGENCE')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'AGENCE' ? 'bg-surface text-primary font-semibold shadow-xs' : 'hover:text-rh-strong'
                }`}
              >
                Agence
              </button>
              <button
                type="button"
                onClick={() => setUnitTab('REGION')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'REGION' ? 'bg-surface text-primary font-semibold shadow-xs' : 'hover:text-rh-strong'
                }`}
              >
                Région
              </button>
              <button
                type="button"
                onClick={() => setUnitTab('DIRECTION')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'DIRECTION' ? 'bg-surface text-primary font-semibold shadow-xs' : 'hover:text-rh-strong'
                }`}
              >
                Direction
              </button>
            </div>
          </div>

          {/* Tableau par unité */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Par unité</caption>
              <thead>
                <tr className="border-b border-rh-line text-xs font-semibold uppercase text-rh-muted tracking-wider">
                  <th className="py-3 px-4">Unité</th>
                  <th className="py-3 px-4 text-right">Employés</th>
                  <th className="py-3 px-4 text-right">Dossiers complets</th>
                  <th className="py-3 px-4 text-right">Certificats reçus</th>
                  <th className="py-3 px-4 text-right">En attente</th>
                  <th className="py-3 px-4 text-right">Rejetés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rh-hover text-rh-text">
                {currentUnits.map((u) => (
                  <tr key={u.unit_code} className="hover:bg-rh-canvas/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-rh-strong">{u.unit_label}</td>
                    <td className="py-3.5 px-4 text-right">{u.employees_count}</td>
                    <td className="py-3.5 px-4 text-right">{u.complete_folders_percent} %</td>
                    <td className="py-3.5 px-4 text-right">{u.received_certificates}</td>
                    <td className="py-3.5 px-4 text-right">{u.waiting_certificates}</td>
                    <td className="py-3.5 px-4 text-right">{u.rejected_certificates}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-input font-semibold text-rh-strong bg-rh-canvas/50">
                  <td className="py-3.5 px-4">Total</td>
                  <td className="py-3.5 px-4 text-right">{totalEmployees}</td>
                  <td className="py-3.5 px-4 text-right">{kpi.complete_folders_percent} %</td>
                  <td className="py-3.5 px-4 text-right">{totalReceivedCerts}</td>
                  <td className="py-3.5 px-4 text-right">{totalWaitingCerts}</td>
                  <td className="py-3.5 px-4 text-right">{totalRejectedCerts}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Page>
  )
}
