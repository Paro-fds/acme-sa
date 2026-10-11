import { useState } from 'react'
import { Link } from 'react-router'
import { getPilotDashboard } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'

const LOGIN_PATH = '/admin/connexion'

/** Écran A02 : la période affichée est le mois en cours, celui de « Rejetés ce mois ». */
function CurrentMonth() {
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())
  return (
    <span className="inline-flex min-h-9 items-center rounded-lg border border-border-input bg-surface px-3 text-sm font-medium text-rh-text shadow-card">
      {month.charAt(0).toUpperCase() + month.slice(1)}
    </span>
  )
}

export default function DashboardPage() {
  const [unitTab, setUnitTab] = useState('AGENCE') // 'AGENCE' | 'REGION' | 'DIRECTION'

  const { data, error, loading, reload } = useLoader(getPilotDashboard, { loginPath: LOGIN_PATH })

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

  const { kpi, distribution, to_process, by_agency, by_region, by_direction } = data

  const currentUnits =
    unitTab === 'AGENCE' ? by_agency : unitTab === 'REGION' ? by_region : by_direction

  const totalEmployees = currentUnits.reduce((acc, u) => acc + u.employees_count, 0)
  const totalReceivedCerts = currentUnits.reduce((acc, u) => acc + u.received_certificates, 0)
  const totalWaitingCerts = currentUnits.reduce((acc, u) => acc + u.waiting_certificates, 0)
  const totalRejectedCerts = currentUnits.reduce((acc, u) => acc + u.rejected_certificates, 0)

  return (
    <Page account="admin" wide title="Tableau de bord" headerActions={<CurrentMonth />}>
      <div className="flex flex-col gap-6">
        {/* Ligne de 4 cartes KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Carte 1 : Employés actifs */}
          <div className="bg-surface rounded-xl border border-rh-line p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-rh-text">Employés actifs</span>
            <div className="mt-3">
              <span className="text-3xl font-bold text-rh-strong">{kpi.active_employees}</span>
            </div>
          </div>

          {/* Carte 2 : Dossiers complets */}
          <div className="bg-surface rounded-xl border border-rh-line p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-rh-text">Dossiers complets</span>
            <div className="mt-2 space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-rh-strong">{kpi.complete_folders_percent} %</span>
                <span className="text-xs text-rh-muted font-medium">({kpi.complete_folders} sur {kpi.active_employees})</span>
              </div>
              <div className="w-full bg-rh-hover rounded-full h-2 overflow-hidden">
                <div
                  className="bg-status-done-text h-2 rounded-full transition-all duration-300"
                  style={{ width: `${kpi.complete_folders_percent}%` }}
                />
              </div>
              <div className="text-xs text-rh-muted">Objectif : {kpi.target_percent} %</div>
            </div>
          </div>

          {/* Carte 3 : Certificats en attente */}
          <div className="bg-surface rounded-xl border border-rh-line p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-rh-text">Certificats en attente</span>
            <div className="mt-2 space-y-1">
              <span className="text-3xl font-bold text-rh-strong">{kpi.waiting_certificates}</span>
              {kpi.overdue_certificates > 0 && (
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-status-progress-text">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    schedule
                  </span>
                  <span>{kpi.overdue_certificates} en retard (plus de 5 jours ouvrables)</span>
                </div>
              )}
            </div>
          </div>

          {/* Carte 4 : Rejetés ce mois */}
          <div className="bg-surface rounded-xl border border-rh-line p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-rh-text">Rejetés ce mois</span>
            <div className="mt-3">
              <span className="text-3xl font-bold text-rh-strong">{kpi.rejected_this_month}</span>
            </div>
          </div>
        </div>

        {/* 2 colonnes : Répartition des dossiers (7 col) & À traiter (5 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bloc Répartition des dossiers (7 colonnes) */}
          <div className="lg:col-span-7 bg-surface rounded-xl border border-rh-line p-6 shadow-xs space-y-5">
            <h2 className="text-base font-semibold text-rh-strong">Répartition des dossiers</h2>

            {/* Barre horizontale empilée */}
            <div className="space-y-3">
              <div className="h-5 w-full flex rounded-lg overflow-hidden bg-rh-hover shadow-inner">
                <div
                  className="bg-rh-chart-incomplete h-full"
                  style={{ width: `${distribution.incomplete_profile_percent}%` }}
                  title={`Profil incomplet: ${distribution.incomplete_profile_count}`}
                />
                <div
                  className="bg-rh-chart-profile h-full"
                  style={{ width: `${distribution.complete_profile_percent}%` }}
                  title={`Profil complet: ${distribution.complete_profile_count}`}
                />
                <div
                  className="bg-status-done-text h-full"
                  style={{ width: `${distribution.complete_folder_percent}%` }}
                  title={`Dossier complet: ${distribution.complete_folder_count}`}
                />
              </div>

              {/* Légende */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-rh-text pt-1">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-rh-chart-incomplete shrink-0" />
                  <span>
                    Profil incomplet {distribution.incomplete_profile_count} ({distribution.incomplete_profile_percent} %)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-rh-chart-profile shrink-0" />
                  <span>
                    Profil complet {distribution.complete_profile_count} ({distribution.complete_profile_percent} %)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-status-done-text shrink-0" />
                  <span>
                    Dossier complet {distribution.complete_folder_count} ({distribution.complete_folder_percent} %)
                  </span>
                </div>
              </div>
            </div>

            {/* Note d'explication */}
            <div className="pt-2 border-t border-rh-hover text-xs text-rh-muted">
              Dossier complet : profil complet et au moins un certificat validé.
            </div>
          </div>

          {/* Bloc À traiter (5 colonnes) */}
          <div className="lg:col-span-5 bg-surface rounded-xl border border-rh-line p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-rh-strong">À traiter</h2>

            <div className="divide-y divide-rh-hover text-sm">
              <Link
                to="/admin/validation"
                className="flex items-center justify-between py-3 group hover:text-primary transition-colors"
              >
                <span className="font-medium text-rh-strong group-hover:text-primary">
                  {to_process.overdue_certificates} certificat{to_process.overdue_certificates > 1 ? 's' : ''} en retard → File de validation
                </span>
                <span className="material-symbols-outlined text-rh-muted text-base group-hover:text-primary transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/admin/signalements"
                className="flex items-center justify-between py-3 group hover:text-primary transition-colors"
              >
                <span className="font-medium text-rh-strong group-hover:text-primary">
                  {to_process.error_reports} signalement{to_process.error_reports > 1 ? 's' : ''} d'erreur → Signalements
                </span>
                <span className="material-symbols-outlined text-rh-muted text-base group-hover:text-primary transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/admin/referentiel"
                className="flex items-center justify-between py-3 group hover:text-primary transition-colors"
              >
                <span className="font-medium text-rh-strong group-hover:text-primary">
                  {to_process.to_attach} valeur{to_process.to_attach > 1 ? 's' : ''} à rattacher → À rattacher
                </span>
                <span className="material-symbols-outlined text-rh-muted text-base group-hover:text-primary transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
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
