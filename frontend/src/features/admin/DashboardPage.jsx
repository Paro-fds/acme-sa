import { useState } from 'react'
import { Link } from 'react-router'
import { getPilotDashboard } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'

const LOGIN_PATH = '/admin/connexion'

export default function DashboardPage() {
  const [unitTab, setUnitTab] = useState('AGENCE') // 'AGENCE' | 'REGION' | 'DIRECTION'

  const { data, error, loading, reload } = useLoader(getPilotDashboard, { loginPath: LOGIN_PATH })

  if (loading) {
    return (
      <Page account="admin" wide={true} title="Tableau de bord">
        <p role="status" className="p-8 text-center text-slate-500">Chargement du tableau de bord…</p>
      </Page>
    )
  }

  if (error) {
    return (
      <Page account="admin" wide={true} title="Tableau de bord">
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
    <Page account="admin" wide={true} title="Tableau de bord">
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1E82]">Tableau de bord</h1>
            <p className="text-sm text-slate-600 mt-1">Pilotage et état d'avancement des dossiers et qualifications des employés.</p>
          </div>

          {/* Filtre de période */}
          <div className="inline-flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-xs">
            <span className="text-sm font-medium text-slate-700">Octobre 2026</span>
            <span className="material-symbols-outlined text-sm text-slate-500" aria-hidden="true">
              expand_more
            </span>
          </div>
        </div>

        {/* Ligne de 4 cartes KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Carte 1 : Employés actifs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-600">Employés actifs</span>
            <div className="mt-3">
              <span className="text-3xl font-bold text-slate-900">{kpi.active_employees}</span>
            </div>
          </div>

          {/* Carte 2 : Dossiers complets */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-600">Dossiers complets</span>
            <div className="mt-2 space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">{kpi.complete_folders_percent} %</span>
                <span className="text-xs text-slate-500 font-medium">({kpi.complete_folders} sur {kpi.active_employees})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#15803D] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${kpi.complete_folders_percent}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">Objectif : {kpi.target_percent} %</div>
            </div>
          </div>

          {/* Carte 3 : Certificats en attente */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-600">Certificats en attente</span>
            <div className="mt-2 space-y-1">
              <span className="text-3xl font-bold text-slate-900">{kpi.waiting_certificates}</span>
              {kpi.overdue_certificates > 0 && (
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#B45309]">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    schedule
                  </span>
                  <span>{kpi.overdue_certificates} en retard (plus de 5 jours ouvrables)</span>
                </div>
              )}
            </div>
          </div>

          {/* Carte 4 : Rejetés ce mois */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-600">Rejetés ce mois</span>
            <div className="mt-3">
              <span className="text-3xl font-bold text-slate-900">{kpi.rejected_this_month}</span>
            </div>
          </div>
        </div>

        {/* 2 colonnes : Répartition des dossiers (7 col) & À traiter (5 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bloc Répartition des dossiers (7 colonnes) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Répartition des dossiers</h2>

            {/* Barre horizontale empilée */}
            <div className="space-y-3">
              <div className="h-5 w-full flex rounded-lg overflow-hidden bg-slate-100 shadow-inner">
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${distribution.incomplete_profile_percent}%` }}
                  title={`Profil incomplet: ${distribution.incomplete_profile_count}`}
                />
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${distribution.complete_profile_percent}%` }}
                  title={`Profil complet: ${distribution.complete_profile_count}`}
                />
                <div
                  className="bg-[#15803D] h-full"
                  style={{ width: `${distribution.complete_folder_percent}%` }}
                  title={`Dossier complet: ${distribution.complete_folder_count}`}
                />
              </div>

              {/* Légende */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-amber-400 shrink-0" />
                  <span>
                    Profil incomplet {distribution.incomplete_profile_count} ({distribution.incomplete_profile_percent} %)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-blue-500 shrink-0" />
                  <span>
                    Profil complet {distribution.complete_profile_count} ({distribution.complete_profile_percent} %)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-[#15803D] shrink-0" />
                  <span>
                    Dossier complet {distribution.complete_folder_count} ({distribution.complete_folder_percent} %)
                  </span>
                </div>
              </div>
            </div>

            {/* Note d'explication */}
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              Dossier complet : profil complet et au moins un certificat validé.
            </div>
          </div>

          {/* Bloc À traiter (5 colonnes) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900">À traiter</h2>

            <div className="divide-y divide-slate-100 text-sm">
              <Link
                to="/admin/validation"
                className="flex items-center justify-between py-3 group hover:text-[#1E1E82] transition-colors"
              >
                <span className="font-medium text-slate-800 group-hover:text-[#1E1E82]">
                  {to_process.overdue_certificates} certificat{to_process.overdue_certificates > 1 ? 's' : ''} en retard → File de validation
                </span>
                <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-[#1E1E82] transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/admin/signalements"
                className="flex items-center justify-between py-3 group hover:text-[#1E1E82] transition-colors"
              >
                <span className="font-medium text-slate-800 group-hover:text-[#1E1E82]">
                  {to_process.error_reports} signalement{to_process.error_reports > 1 ? 's' : ''} d'erreur → Signalements
                </span>
                <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-[#1E1E82] transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/admin/referentiel"
                className="flex items-center justify-between py-3 group hover:text-[#1E1E82] transition-colors"
              >
                <span className="font-medium text-slate-800 group-hover:text-[#1E1E82]">
                  {to_process.to_attach} valeur{to_process.to_attach > 1 ? 's' : ''} à rattacher → À rattacher
                </span>
                <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-[#1E1E82] transition-transform group-hover:translate-x-0.5">
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bloc Par unité */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Par unité</h2>

            {/* Sélecteur à trois onglets Agence / Région / Direction */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setUnitTab('AGENCE')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'AGENCE' ? 'bg-white text-[#1E1E82] font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Agence
              </button>
              <button
                type="button"
                onClick={() => setUnitTab('REGION')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'REGION' ? 'bg-white text-[#1E1E82] font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Région
              </button>
              <button
                type="button"
                onClick={() => setUnitTab('DIRECTION')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  unitTab === 'DIRECTION' ? 'bg-white text-[#1E1E82] font-semibold shadow-xs' : 'hover:text-slate-900'
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
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Unité</th>
                  <th className="py-3 px-4 text-right">Employés</th>
                  <th className="py-3 px-4 text-right">Dossiers complets</th>
                  <th className="py-3 px-4 text-right">Certificats reçus</th>
                  <th className="py-3 px-4 text-right">En attente</th>
                  <th className="py-3 px-4 text-right">Rejetés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentUnits.map((u) => (
                  <tr key={u.unit_code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{u.unit_label}</td>
                    <td className="py-3.5 px-4 text-right">{u.employees_count}</td>
                    <td className="py-3.5 px-4 text-right">{u.complete_folders_percent} %</td>
                    <td className="py-3.5 px-4 text-right">{u.received_certificates}</td>
                    <td className="py-3.5 px-4 text-right">{u.waiting_certificates}</td>
                    <td className="py-3.5 px-4 text-right">{u.rejected_certificates}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold text-slate-900 bg-slate-50/50">
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
