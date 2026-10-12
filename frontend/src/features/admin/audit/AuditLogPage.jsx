import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { getAuditLog } from '../../../api/admin.js'
import { useLoader } from '../../../lib/useLoader.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'

function ActionBadge({ action, label }) {
  if (action === 'VALIDATION') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-done-bg text-status-done-text">
        <svg className="w-3 h-3 mr-1 text-status-done-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
        {label || 'Validation'}
      </span>
    )
  }
  if (action === 'REJECTION') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-progress-bg text-status-progress-text">
        <svg className="w-3 h-3 mr-1 text-status-progress-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {label || 'Rejet'}
      </span>
    )
  }
  if (action === 'ACCOUNT_MANAGEMENT' || action === 'RESET_ACCESS') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-bg text-info-text">
        <svg className="w-3 h-3 mr-1 text-info-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {label || 'Gestion des comptes'}
      </span>
    )
  }
  if (action === 'REASSIGNMENT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
        <svg className="w-3 h-3 mr-1 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {label || 'Réaffectation'}
      </span>
    )
  }
  if (action === 'REFERENTIAL_CHANGE') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary">
        <svg className="w-3 h-3 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        {label || 'Modification du référentiel'}
      </span>
    )
  }
  if (action === 'EXPORT') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rh-hover text-rh-text">
        <svg className="w-3 h-3 mr-1 text-rh-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {label || 'Export'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rh-hover text-rh-text">
      <svg className="w-3 h-3 mr-1 text-rh-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      {label || "Consultation d'un dossier"}
    </span>
  )
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1
  const period = searchParams.get('period') ?? ''
  const actor = searchParams.get('actor') ?? ''
  const action = searchParams.get('action') ?? ''
  const target = searchParams.get('target') ?? ''

  const { data, error, loading } = useLoader(
    () => getAuditLog({ actor, target, action, period, page, pageSize: 20 }),
    {
      loginPath: '/admin/connexion',
      key: `${actor}|${target}|${action}|${period}|${page}`,
    }
  )

  function changeFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'Toutes' && value !== 'Tous' && value.trim()) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function changePage(next) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
    window.scrollTo?.({ top: 0 })
  }

  return (
    <Page account="admin" wide title="Journal d'audit" subtitle="Toutes les actions des RH sur le portail.">
      <div className="flex flex-col gap-6">
        {/* FILTRES SUR UNE LIGNE (A11) */}
        <div className="bg-surface p-4 rounded-xl border border-rh-line shadow-card flex flex-wrap items-center gap-6 text-sm">
          {/* Filtre Période */}
          <div className="flex max-w-full min-w-0 items-center space-x-2">
            <label htmlFor="filter-period" className="text-xs font-semibold text-rh-muted uppercase tracking-wider">
              Période
            </label>
            <select
              id="filter-period"
              value={period || 'Toutes'}
              onChange={(e) => changeFilter('period', e.target.value)}
              className="max-w-full min-w-0 border border-border-input rounded-lg px-3 py-1.5 text-sm bg-rh-canvas text-rh-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Toutes">Toutes</option>
              <option value="2026-10">Octobre 2026</option>
              <option value="2026-09">Septembre 2026</option>
              <option value="2026-08">Août 2026</option>
            </select>
          </div>

          {/* Filtre Personne */}
          <div className="flex max-w-full min-w-0 items-center space-x-2">
            <label htmlFor="filter-actor" className="text-xs font-semibold text-rh-muted uppercase tracking-wider">
              Personne
            </label>
            <select
              id="filter-actor"
              value={actor || 'Toutes'}
              onChange={(e) => changeFilter('actor', e.target.value)}
              className="max-w-full min-w-0 border border-border-input rounded-lg px-3 py-1.5 text-sm bg-rh-canvas text-rh-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Toutes">Toutes</option>
              {data?.actors?.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Type d'action */}
          <div className="flex max-w-full min-w-0 items-center space-x-2">
            <label htmlFor="filter-action" className="text-xs font-semibold text-rh-muted uppercase tracking-wider">
              Type d'action
            </label>
            <select
              id="filter-action"
              value={action || 'Tous'}
              onChange={(e) => changeFilter('action', e.target.value)}
              className="max-w-full min-w-0 border border-border-input rounded-lg px-3 py-1.5 text-sm bg-rh-canvas text-rh-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Tous">Tous</option>
              <option value="DOSSIER_VIEW">Consultation d'un dossier</option>
              <option value="DOCUMENT_VIEW">Consultation d'un document</option>
              <option value="VALIDATION">Validation</option>
              <option value="REJECTION">Rejet</option>
              <option value="REASSIGNMENT">Réaffectation</option>
              <option value="EXPORT">Export</option>
              <option value="REFERENTIAL_CHANGE">Modification du référentiel</option>
              <option value="ACCOUNT_MANAGEMENT">Gestion des comptes</option>
            </select>
          </div>
        </div>

        {/* TABLEAU DU JOURNAL D'AUDIT */}
        <div className="bg-surface rounded-xl border border-rh-line shadow-card overflow-hidden">
          {loading ? (
            <p role="status" className="p-8 text-center text-rh-muted">Chargement du journal…</p>
          ) : error ? (
            <div className="p-6"><Alert>{error.message}</Alert></div>
          ) : data.items.length === 0 ? (
            <p className="p-8 text-center text-rh-muted">Aucune entrée dans le journal d'audit pour ces critères.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table aria-label="Journal d'audit" className="w-full text-left text-sm">
                  <thead className="bg-rh-canvas text-rh-text text-xs uppercase tracking-wider font-semibold border-b border-rh-line">
                    <tr>
                      <th scope="col" className="py-3.5 px-4 w-44">Date et heure</th>
                      <th scope="col" className="py-3.5 px-4 w-48">Personne</th>
                      <th scope="col" className="py-3.5 px-4 w-48">Action</th>
                      <th scope="col" className="py-3.5 px-4 w-44">Employé ou objet</th>
                      <th scope="col" className="py-3.5 px-4">Détail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rh-hover text-rh-text">
                    {data.items.map((entry) => (
                      <tr key={entry.id} className="hover:bg-rh-canvas/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-rh-muted text-xs font-medium">
                          {formatDate(entry.at)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-rh-strong">
                          {entry.actor_name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <ActionBadge action={entry.action} label={entry.action_label} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-rh-strong">
                          {entry.target_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-rh-text">
                          {entry.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION ET COMPTEUR (A11) */}
              <div className="px-6 py-4 bg-surface border-t border-rh-line flex items-center justify-between text-xs text-rh-muted">
                <div>
                  {data.total > 0
                    ? `${(data.page - 1) * data.page_size + 1} à ${Math.min(data.page * data.page_size, data.total)} sur ${data.total}`
                    : '0 résultat'}
                </div>
                {data.page_count > 1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={data.page <= 1}
                      onClick={() => changePage(data.page - 1)}
                      className="px-2.5 py-1 border border-rh-line rounded text-rh-text hover:bg-rh-canvas disabled:text-rh-line disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <span className="px-2 py-1 bg-primary text-white font-medium rounded">
                      {data.page}
                    </span>
                    <button
                      type="button"
                      disabled={data.page >= data.page_count}
                      onClick={() => changePage(data.page + 1)}
                      className="px-2.5 py-1 border border-rh-line rounded text-rh-text hover:bg-rh-canvas disabled:text-rh-line disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
