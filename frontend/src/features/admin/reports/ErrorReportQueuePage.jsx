import { useState } from 'react'
import { decideReport, listReports } from '../../../api/reports.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatLocalDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'

const LOGIN_PATH = '/admin/connexion'

function StatusBadge({ status, label }) {
  if (status === 'NEW') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{label || 'Nouveau'}</span>
  }
  if (status === 'IN_PROGRESS') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{label || 'En cours'}</span>
  }
  if (status === 'CORRECTED') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{label || 'Corrigé — en attente du système RH'}</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{label || 'Clos — valeur exacte'}</span>
}

export default function ErrorReportQueuePage() {
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [originFilter, setOriginFilter] = useState('Toutes')
  const [agencyFilter, setAgencyFilter] = useState('Toutes')
  const [selectedId, setSelectedId] = useState(null)
  const [decision, setDecision] = useState('INDICATED_IS_CORRECT')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState(null)
  const [errorNotice, setErrorNotice] = useState(null)

  const { data, loading, error, reload } = useLoader(
    () => listReports({ status: statusFilter, origin: originFilter, agency: agencyFilter }),
    { key: `${statusFilter}-${originFilter}-${agencyFilter}`, loginPath: LOGIN_PATH }
  )

  const reports = data?.items || []
  // Sélectionner par défaut le premier élément s'il n'y a pas de sélection active
  const selectedReport = reports.find((r) => r.id === selectedId) || reports[0] || null

  async function handleSaveDecision(e) {
    e.preventDefault()
    if (!selectedReport) return
    setSubmitting(true)
    setErrorNotice(null)
    setFeedbackNotice(null)
    try {
      await decideReport(selectedReport.id, { decision, comment })
      setFeedbackNotice(`Décision enregistrée pour ${selectedReport.employee_name} (${selectedReport.field_label}).`)
      setComment('')
      reload()
    } catch (err) {
      setErrorNotice(err.message || 'Impossible d\'enregistrer la décision.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page account="admin" wide={true} title="Signalements d'erreur">
      <div className="flex flex-col gap-6">
        {/* En-tête de la page */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E1E82]">Signalements d'erreur</h1>
          <p className="text-sm text-slate-600 mt-1">
            Erreurs signalées par les employés sur une donnée qu'ils ne peuvent pas modifier, et contrôles automatiques de cohérence.
          </p>
        </div>

        {feedbackNotice && <Alert tone="success">{feedbackNotice}</Alert>}
        {errorNotice && <Alert>{errorNotice}</Alert>}
        {error && <Alert>{error.message}</Alert>}

        {/* Filtres */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-6 text-sm shadow-xs">
          <div className="flex items-center space-x-2">
            <label htmlFor="filter-status" className="font-medium text-slate-700 whitespace-nowrap">Statut</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E1E82]"
            >
              <option value="Tous">Tous</option>
              <option value="NEW">Nouveau</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="CORRECTED">Corrigé — en attente du système RH</option>
              <option value="CLOSED_ACCURATE">Clos — valeur exacte</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="filter-origin" className="font-medium text-slate-700 whitespace-nowrap">Origine</label>
            <select
              id="filter-origin"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E1E82]"
            >
              <option value="Toutes">Toutes</option>
              <option value="EMPLOYEE">Signalé par l'employé</option>
              <option value="AUTOMATIC">Contrôle automatique</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="filter-agency" className="font-medium text-slate-700 whitespace-nowrap">Agence</label>
            <select
              id="filter-agency"
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E1E82]"
            >
              <option value="Toutes">Toutes</option>
              <option value="Agence Démo Nord">Agence Démo Nord</option>
              <option value="Agence Démo Sud">Agence Démo Sud</option>
              <option value="Agence Démo Centre">Agence Démo Centre</option>
            </select>
          </div>
        </div>

        {/* Grille principale : Tableau (8 col) + Volet de décision (4 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tableau (colonne gauche : 8/12) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Chargement des signalements…</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucun signalement ne correspond aux critères sélectionnés.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Employé</th>
                      <th className="py-3 px-4">Champ</th>
                      <th className="py-3 px-4">Valeur actuelle</th>
                      <th className="py-3 px-4">Valeur indiquée</th>
                      <th className="py-3 px-4">Origine</th>
                      <th className="py-3 px-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((r) => {
                      const isSelected = selectedReport && selectedReport.id === r.id
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/70 border-l-4 border-[#1E1E82]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                            {formatLocalDate(r.at)}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {r.employee_name}
                            <span className="text-xs font-normal text-slate-500 block">{r.agency_name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{r.field_label}</td>
                          <td className="py-3.5 px-4 text-slate-600">{r.current_value}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">{r.indicated_value || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">{r.origin_label}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={r.status} label={r.status_label} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination / compteur */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 font-medium">
              1 à {reports.length} sur {data?.total || reports.length}
            </div>
          </div>

          {/* Panneau de traitement à droite (colonne droite : 4/12) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            {selectedReport ? (
              <div>
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedReport.employee_name} · {selectedReport.field_label}
                  </h2>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-32 shrink-0">Valeur actuelle :</span>
                      <span className="font-medium text-slate-800">{selectedReport.current_value}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-32 shrink-0">Valeur indiquée :</span>
                      <span className="font-medium text-[#1E1E82]">{selectedReport.indicated_value || '—'}</span>
                    </div>
                  </div>
                  {selectedReport.comment && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                      <span className="font-medium text-slate-600">Précision de l'employé :</span> « {selectedReport.comment} »
                    </div>
                  )}
                </div>

                {/* Formulaire de Décision */}
                <form onSubmit={handleSaveDecision} className="space-y-4">
                  <div>
                    <span className="block text-sm font-semibold text-slate-800 mb-2">Décision</span>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="INDICATED_IS_CORRECT"
                          checked={decision === 'INDICATED_IS_CORRECT'}
                          onChange={() => setDecision('INDICATED_IS_CORRECT')}
                          className="text-[#1E1E82] focus:ring-[#1E1E82]"
                        />
                        <span>La valeur indiquée est juste</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="CURRENT_IS_CORRECT"
                          checked={decision === 'CURRENT_IS_CORRECT'}
                          onChange={() => setDecision('CURRENT_IS_CORRECT')}
                          className="text-[#1E1E82] focus:ring-[#1E1E82]"
                        />
                        <span>La valeur actuelle est juste</span>
                      </label>
                    </div>
                  </div>

                  {/* Commentaire */}
                  <div>
                    <label htmlFor="decision-comment" className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Commentaire
                    </label>
                    <textarea
                      id="decision-comment"
                      rows="3"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E1E82] resize-none"
                      placeholder="Ajouter un commentaire..."
                    />
                  </div>

                  {/* Bouton Enregistrer */}
                  <div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#1E1E82] text-white font-medium py-2 px-4 rounded-lg hover:bg-[#17176b] text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Enregistrement…' : 'Enregistrer la décision'}
                    </button>
                  </div>

                  {/* Note d'information */}
                  <div className="flex items-start space-x-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="material-symbols-outlined text-slate-400 text-sm mt-0.5 shrink-0" aria-hidden="true">
                      info
                    </span>
                    <span>La correction est reportée dans le système RH, qui reste la source officielle.</span>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                Sélectionnez un signalement dans le tableau pour traiter la demande.
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
