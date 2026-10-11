import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { claimNextCertificate, getValidationQueue } from '../../../api/validation.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatLocalDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'

const LOGIN_PATH = '/admin/connexion'

export default function ValidationQueuePage() {
  const navigate = useNavigate()
  const [agencyFilter, setAgencyFilter] = useState('Toutes')
  const [levelFilter, setLevelFilter] = useState('Tous')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [errorNotice, setErrorNotice] = useState(null)

  const { data, loading, error, reload } = useLoader(
    () =>
      getValidationQueue({
        agency: agencyFilter,
        level: levelFilter,
        certificate_type: typeFilter,
        overdue_only: overdueOnly,
      }),
    { key: `${agencyFilter}-${levelFilter}-${typeFilter}-${overdueOnly}`, loginPath: LOGIN_PATH },
  )

  async function handleClaimNext() {
    setErrorNotice(null)
    setClaiming(true)
    try {
      const res = await claimNextCertificate()
      if (res.claimed && res.certificate_id) {
        navigate(`/admin/validation/${res.certificate_id}`)
      } else {
        setErrorNotice('Aucun certificat en attente dans la file.')
        reload()
      }
    } catch (err) {
      setErrorNotice(err.message || 'Impossible de prendre le certificat suivant.')
    } finally {
      setClaiming(false)
    }
  }

  const items = data?.items || []
  const totalWaiting = data?.total_waiting ?? 0
  const totalOverdue = data?.total_overdue ?? 0

  return (
    <Page account="admin" title="File de validation" wide>
      <div className="flex flex-col gap-6">
        {/* HAUT DE PAGE */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1E82]">
              File de validation des certificats
            </h1>
            <p className="mt-1 font-medium text-slate-600">
              {totalWaiting} certificat{totalWaiting > 1 ? 's' : ''} en attente · {totalOverdue} en retard
            </p>
          </div>

          <button
            type="button"
            onClick={handleClaimNext}
            disabled={claiming || totalWaiting === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#1E1E82] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#151566] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              assignment_ind
            </span>
            {claiming ? 'Attribution…' : 'Prendre le suivant'}
          </button>
        </div>

        {errorNotice && <Alert>{errorNotice}</Alert>}
        {error && <Alert>{error.message}</Alert>}

        {/* Note discrète d'information */}
        <div className="flex items-center gap-2.5 rounded-md border border-blue-200/80 bg-blue-50/70 px-4 py-2.5 text-sm text-slate-700">
          <span className="material-symbols-outlined shrink-0 text-[#1E1E82]" aria-hidden="true">
            info
          </span>
          <span>
            Vos propres certificats n'apparaissent pas dans votre file : ils sont traités par un autre valideur.
          </span>
        </div>

        {/* FILTRES SUR UNE LIGNE */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {/* Agence */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-agency" className="font-medium text-slate-600">
                Agence :
              </label>
              <select
                id="filter-agency"
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-[#1E1E82] focus:outline-none"
              >
                <option value="Toutes">Toutes</option>
                <option value="Agence Démo Nord">Agence Démo Nord</option>
                <option value="Agence Démo Sud">Agence Démo Sud</option>
                <option value="Agence Démo Centre">Agence Démo Centre</option>
              </select>
            </div>

            {/* Niveau déclaré */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-level" className="font-medium text-slate-600">
                Niveau déclaré :
              </label>
              <select
                id="filter-level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-[#1E1E82] focus:outline-none"
              >
                <option value="Tous">Tous</option>
                <option value="LICENCE">Licence</option>
                <option value="MASTER">Master</option>
                <option value="BAC_2">Technicien supérieur / Bac + 2</option>
                <option value="CERTIFICATION_PRO">Certification professionnelle</option>
              </select>
            </div>

            {/* Type de document */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-type" className="font-medium text-slate-600">
                Type de document :
              </label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-[#1E1E82] focus:outline-none"
              >
                <option value="Tous">Tous : Diplôme, Certificat, Attestation</option>
                <option value="DIPLOME">Diplôme</option>
                <option value="CERTIFICAT">Certificat</option>
                <option value="ATTESTATION">Attestation</option>
              </select>
            </div>

            {/* En retard seulement */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retard-only"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="size-4 cursor-pointer rounded border-slate-300 text-[#1E1E82] focus:ring-0"
              />
              <label htmlFor="retard-only" className="cursor-pointer font-medium text-slate-700">
                En retard seulement
              </label>
            </div>
          </div>
        </div>

        {/* LISTE / TABLEAU */}
        {loading ? (
          <p role="status" className="py-8 text-center text-slate-500">
            Chargement de la file…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
            <p className="mt-2 font-medium">Aucun certificat en attente de validation.</p>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {/* Version mobile : cartes */}
            <ul aria-label="Certificats en attente" className="flex flex-col divide-y divide-slate-100 lg:hidden">
              {items.map((item) => (
                <li key={item.certificate_id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.employee_name} · {item.employee_code}
                      </p>
                      <p className="text-xs text-slate-500">{item.agency_name || 'Agence non renseignée'}</p>
                    </div>
                    {item.is_overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        En retard ({item.business_days} j)
                      </span>
                    ) : item.assigned_to ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        En cours — {item.assigned_to}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {item.title} · {item.certificate_type_label}
                  </p>
                  <p className="text-xs text-slate-600">Niveau : {item.declared_level_label}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                    <span>Déposé le {formatLocalDate(item.submitted_at)}</span>
                    <Link
                      to={`/admin/validation/${item.certificate_id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded bg-[#1E1E82] px-4 py-2 font-semibold text-white"
                    >
                      Traiter
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {/* Version desktop : grand tableau */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-semibold tracking-wider text-slate-600 uppercase">
                    <th className="px-4 py-3">Employé</th>
                    <th className="px-4 py-3">Agence</th>
                    <th className="px-4 py-3">Certificat</th>
                    <th className="px-4 py-3">Niveau déclaré</th>
                    <th className="px-4 py-3">Déposé le</th>
                    <th className="px-4 py-3">Délai</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item) => (
                    <tr key={item.certificate_id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-slate-900">
                        {item.employee_name} · {item.employee_code}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                        {item.agency_name || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {item.title} · {item.certificate_type_label}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{item.declared_level_label}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                        {formatLocalDate(item.submitted_at)}
                      </td>
                      <td className="px-4 py-3.5 font-medium whitespace-nowrap text-slate-700">
                        {item.business_days} j ouvrables
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.is_overdue ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            En retard ({item.business_days} j)
                          </span>
                        ) : item.assigned_to ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            En cours — {item.assigned_to}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <span className="size-1.5 rounded-full bg-slate-500" />
                            Nouveau
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/validation/${item.certificate_id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded bg-[#1E1E82] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#151566]"
                        >
                          Traiter
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pied de tableau */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 text-sm text-slate-600">
              <span className="font-medium">
                1 à {items.length} sur {totalWaiting}
              </span>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
