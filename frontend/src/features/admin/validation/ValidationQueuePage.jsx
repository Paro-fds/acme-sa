import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { claimNextCertificate, getValidationQueue } from '../../../api/validation.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatLocalDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'
import { useUnits } from '../useUnits.js'

const LOGIN_PATH = '/admin/connexion'

export default function ValidationQueuePage() {
  const navigate = useNavigate()
  const { agencies } = useUnits()
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

  const claimButton = (
    <button
      type="button"
      onClick={handleClaimNext}
      disabled={claiming || totalWaiting === 0}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-active disabled:opacity-50"
    >
      {claiming ? 'Attribution…' : 'Prendre le suivant'}
    </button>
  )

  return (
    <Page
      account="admin"
      wide
      title="File de validation des certificats"
      subtitle={`${totalWaiting} certificat${totalWaiting > 1 ? 's' : ''} en attente · ${totalOverdue} en retard`}
      headerActions={claimButton}
    >
      <div className="flex flex-col gap-6">
        {errorNotice && <Alert>{errorNotice}</Alert>}
        {error && <Alert>{error.message}</Alert>}

        {/* Note discrète d'information */}
        <div className="flex items-center gap-2.5 rounded-md border border-info-border/80 bg-info-bg/70 px-4 py-2.5 text-sm text-rh-text">
          <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">
            info
          </span>
          <span>
            Vos propres certificats n'apparaissent pas dans votre file : ils sont traités par un autre valideur.
          </span>
        </div>

        {/* FILTRES SUR UNE LIGNE */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-rh-line bg-surface p-4 shadow-card">
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-5 text-sm">
            {/* Agence */}
            <div className="flex max-w-full min-w-0 items-center gap-2">
              <label htmlFor="filter-agency" className="font-medium text-rh-text">
                Agence :
              </label>
              <select
                id="filter-agency"
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="max-w-full min-w-0 rounded border border-border-input bg-rh-canvas px-2.5 py-1.5 text-sm font-medium text-rh-strong focus:border-primary focus:outline-none"
              >
                <option value="Toutes">Toutes</option>
                {agencies.map((agency) => (
                  <option key={agency.code} value={agency.code}>
                    {agency.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Niveau déclaré */}
            <div className="flex max-w-full min-w-0 items-center gap-2">
              <label htmlFor="filter-level" className="font-medium text-rh-text">
                Niveau déclaré :
              </label>
              <select
                id="filter-level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="max-w-full min-w-0 rounded border border-border-input bg-rh-canvas px-2.5 py-1.5 text-sm font-medium text-rh-strong focus:border-primary focus:outline-none"
              >
                <option value="Tous">Tous</option>
                <option value="LICENCE">Licence</option>
                <option value="MASTER">Master</option>
                <option value="BAC_2">Technicien supérieur / Bac + 2</option>
                <option value="CERTIFICATION_PRO">Certification professionnelle</option>
              </select>
            </div>

            {/* Type de document */}
            <div className="flex max-w-full min-w-0 items-center gap-2">
              <label htmlFor="filter-type" className="font-medium text-rh-text">
                Type de document :
              </label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="max-w-full min-w-0 rounded border border-border-input bg-rh-canvas px-2.5 py-1.5 text-sm font-medium text-rh-strong focus:border-primary focus:outline-none"
              >
                <option value="Tous">Tous : Diplôme, Certificat, Attestation</option>
                <option value="DIPLOME">Diplôme</option>
                <option value="CERTIFICAT">Certificat</option>
                <option value="ATTESTATION">Attestation</option>
              </select>
            </div>

            {/* En retard seulement */}
            <div className="flex max-w-full min-w-0 items-center gap-2">
              <input
                type="checkbox"
                id="retard-only"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="size-4 cursor-pointer rounded border-border-input text-primary focus:ring-0"
              />
              <label htmlFor="retard-only" className="cursor-pointer font-medium text-rh-text">
                En retard seulement
              </label>
            </div>
          </div>
        </div>

        {/* LISTE / TABLEAU */}
        {loading ? (
          <p role="status" className="py-8 text-center text-rh-muted">
            Chargement de la file…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-input bg-surface p-12 text-center text-rh-muted">
            <span className="material-symbols-outlined text-4xl text-rh-muted">task_alt</span>
            <p className="mt-2 font-medium">Aucun certificat en attente de validation.</p>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-lg border border-rh-line bg-surface shadow-card">
            {/* Version mobile : cartes */}
            <ul aria-label="Certificats en attente" className="flex flex-col divide-y divide-rh-hover lg:hidden">
              {items.map((item) => (
                <li key={item.certificate_id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-rh-strong">
                        {item.employee_name} · {item.employee_code}
                      </p>
                      <p className="text-xs text-rh-muted">{item.agency_name || 'Agence non renseignée'}</p>
                    </div>
                    {item.is_overdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-progress-border bg-status-progress-bg px-2.5 py-0.5 text-xs font-semibold text-status-progress-text">
                        En retard ({item.business_days} j)
                      </span>
                    ) : item.assigned_to ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info-text">
                        En cours — {item.assigned_to}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rh-line bg-rh-hover px-2 py-0.5 text-xs font-semibold text-rh-text">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-rh-strong">
                    {item.title} · {item.certificate_type_label}
                  </p>
                  <p className="text-xs text-rh-text">Niveau : {item.declared_level_label}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-rh-hover pt-2 text-xs text-rh-muted">
                    <span>Déposé le {formatLocalDate(item.submitted_at)}</span>
                    <Link
                      to={`/admin/validation/${item.certificate_id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded bg-primary px-4 py-2 font-semibold text-white"
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
                  <tr className="border-b border-rh-line bg-rh-hover/80 text-xs font-semibold tracking-wider text-rh-text uppercase">
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
                <tbody className="divide-y divide-rh-hover text-sm">
                  {items.map((item) => (
                    <tr key={item.certificate_id} className="transition-colors hover:bg-rh-canvas">
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap text-rh-strong">
                        {item.employee_name} · {item.employee_code}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-rh-text">
                        {item.agency_name || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-rh-strong">
                        {item.title} · {item.certificate_type_label}
                      </td>
                      <td className="px-4 py-3.5 text-rh-text">{item.declared_level_label}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-rh-text">
                        {formatLocalDate(item.submitted_at)}
                      </td>
                      <td className="px-4 py-3.5 font-medium whitespace-nowrap text-rh-text">
                        {item.business_days} j ouvrables
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.is_overdue ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-progress-border bg-status-progress-bg px-2.5 py-1 text-xs font-semibold text-status-progress-text">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            En retard ({item.business_days} j)
                          </span>
                        ) : item.assigned_to ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-info-border bg-info-bg px-2.5 py-1 text-xs font-semibold text-info-text">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            En cours — {item.assigned_to}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rh-line bg-rh-hover px-2.5 py-1 text-xs font-semibold text-rh-text">
                            <span className="size-1.5 rounded-full bg-rh-muted" />
                            Nouveau
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/validation/${item.certificate_id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-active"
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
            <div className="flex items-center justify-between border-t border-rh-line bg-rh-canvas px-6 py-3.5 text-sm text-rh-text">
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
