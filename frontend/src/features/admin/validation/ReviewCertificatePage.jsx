import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  correctCertificateFields,
  decideCertificate,
  getCertificateFileUrl,
  getCertificateReview,
} from '../../../api/validation.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatDateTime, formatLocalDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'

const LOGIN_PATH = '/admin/connexion'

const MOTIFS_REJET = [
  'Document illisible ou de mauvaise qualité',
  'Document incomplet (pages manquantes)',
  "Nom de l'employé absent ou différent de celui du dossier",
  'Document non reconnu comme diplôme, certificat ou attestation',
  'Niveau déclaré non conforme au document',
  'Établissement ou année non identifiable',
  'Document expiré ou non valide',
  "Doublon d'un document déjà validé",
  'Fichier endommagé ou format non conforme',
  'Autre',
]

function RejectionModal({ certificate, onConfirm, onCancel, submitting }) {
  const [reason, setReason] = useState(MOTIFS_REJET[0])
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (reason === 'Autre' && !comment.trim()) {
      setError('Le commentaire pour l’employé est obligatoire pour le motif « Autre ».')
      return
    }
    onConfirm({ reason, comment })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-[#1E1E82]">Rejeter ce certificat</h2>
          <p className="text-xs font-medium text-slate-500">
            {certificate.title} · {certificate.level}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Motif du rejet (un seul)</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {MOTIFS_REJET.map((motif) => (
                  <label
                    key={motif}
                    className="flex cursor-pointer items-start gap-3 rounded p-1.5 transition-colors hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name="motif"
                      value={motif}
                      checked={reason === motif}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setError(null)
                      }}
                      className="mt-0.5 size-4 text-[#1E1E82] focus:ring-0"
                    />
                    <span className="text-slate-800">{motif}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reject-comment" className="mb-1 block text-sm font-semibold text-slate-900">
                Commentaire pour l’employé (facultatif, obligatoire si « Autre »)
              </label>
              <textarea
                id="reject-comment"
                rows={3}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  setError(null)
                }}
                placeholder="Explication claire et bienveillante pour aider l'employé…"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-[#1E1E82] focus:ring-1 focus:ring-[#1E1E82] focus:outline-none"
              />
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs font-semibold text-slate-600 uppercase">
                Aperçu de la notification
              </span>
              <p className="mt-1 text-xs text-slate-700">
                Votre certificat « {certificate.title} » n'a pas pu être validé ({reason.toLowerCase()}).{' '}
                {comment ? comment : 'Merci de vérifier votre document et de le soumettre à nouveau.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="min-h-11 rounded-lg px-4 font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-700 px-5 font-semibold text-white shadow-sm transition-colors hover:bg-amber-800 disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Confirmer le rejet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ReviewCertificatePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, loading, error, reload } = useLoader(() => getCertificateReview(id), {
    key: id,
    loginPath: LOGIN_PATH,
  })

  const [formFields, setFormFields] = useState({
    certificate_type: 'DIPLOME',
    level: 'LICENCE',
    title: '',
    institution: '',
    year: 2020,
    domain: '',
    country: '',
  })
  const [dirty, setDirty] = useState(false)
  const [savingFields, setSavingFields] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (data?.certificate) {
      setFormFields({
        certificate_type: data.certificate.certificate_type,
        level: data.certificate.level,
        title: data.certificate.title,
        institution: data.certificate.institution,
        year: data.certificate.year,
        domain: data.certificate.domain || '',
        country: data.certificate.country || '',
      })
      setDirty(false)
    }
  }, [data])

  async function handleSaveCorrections() {
    setActionError(null)
    setSavingFields(true)
    try {
      await correctCertificateFields(id, formFields)
      setNotice('Modifications enregistrées.')
      setDirty(false)
      reload()
    } catch (err) {
      setActionError(err.message || 'Impossible d’enregistrer les modifications.')
    } finally {
      setSavingFields(false)
    }
  }

  async function handleValidate() {
    setActionError(null)
    setDeciding(true)
    try {
      if (dirty) {
        await correctCertificateFields(id, formFields)
      }
      await decideCertificate(id, { decision: 'VALIDATED' })
      navigate('/admin/validation')
    } catch (err) {
      setActionError(err.message || 'Impossible de valider ce certificat.')
      setDeciding(false)
    }
  }

  async function handleConfirmReject({ reason, comment }) {
    setActionError(null)
    setDeciding(true)
    try {
      await decideCertificate(id, { decision: 'REJECTED', reason, comment })
      setRejectModalOpen(false)
      navigate('/admin/validation')
    } catch (err) {
      setActionError(err.message || 'Impossible de rejeter ce certificat.')
      setDeciding(false)
    }
  }

  if (loading) {
    return (
      <Page account="admin" title="Examiner un certificat" backTo="/admin/validation" wide>
        <p role="status" className="py-12 text-center text-slate-500">
          Chargement du dossier…
        </p>
      </Page>
    )
  }

  if (error) {
    return (
      <Page account="admin" title="Examiner un certificat" backTo="/admin/validation" wide>
        <Alert>{error.message}</Alert>
      </Page>
    )
  }

  const { certificate, employee, files, history, business_days } = data
  const fileUrl = getCertificateFileUrl(id)
  const isImage = files?.[0]?.content_type?.startsWith('image/')

  return (
    <Page account="admin" title="Examiner un certificat" backTo="/admin/validation" wide>
      <div className="flex flex-col gap-6 pb-24">
        {/* Fil d'Ariane & En-tête */}
        <div className="flex flex-col gap-2">
          <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500">
            <Link to="/admin/validation" className="hover:text-slate-800">
              File de validation
            </Link>{' '}
            › <span className="font-semibold text-slate-800">{employee.name}</span>
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h1 className="text-2xl font-bold text-[#1E1E82]">{certificate.title}</h1>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium text-slate-600">
                Déposé il y a {business_days} j ouvrable{business_days > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                <span className="material-symbols-outlined text-[14px]">person</span>
                En cours — {certificate.assigned_to || 'Non assigné'}
              </span>
            </div>
          </div>
        </div>

        {notice && <Alert tone="success">{notice}</Alert>}
        {actionError && <Alert>{actionError}</Alert>}

        {/* CONTENU PRINCIPAL EN 2 COLONNES (Maquette A04) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* COLONNE GAUCHE (7/12) : APERÇU DU DOCUMENT */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
              <span className="font-semibold">{files?.[0]?.original_name || 'Document'}</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#1E1E82] hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Plein écran
              </a>
            </div>

            <div className="flex min-h-[560px] flex-1 items-center justify-center bg-slate-100 p-4">
              {isImage ? (
                <img
                  src={fileUrl}
                  alt={`Certificat de ${employee.name}`}
                  className="max-h-[600px] w-auto max-w-full rounded border border-slate-300 bg-white object-contain shadow-md"
                />
              ) : (
                <iframe
                  src={fileUrl}
                  title={`Certificat de ${employee.name}`}
                  className="h-[600px] w-full rounded border border-slate-300 bg-white shadow-sm"
                />
              )}
            </div>
          </div>

          {/* COLONNE DROITE (5/12) : 3 BLOCS */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            {/* 1. BLOC L'EMPLOYÉ */}
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                L'employé
              </h2>
              <dl className="flex flex-col divide-y divide-slate-100 text-xs">
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">Identité</dt>
                  <dd className="font-semibold text-slate-900">
                    {employee.name} · {employee.employee_code}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">Poste &amp; Agence</dt>
                  <dd className="font-medium text-slate-800">
                    {employee.position} · {employee.agency_name}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">Embauche</dt>
                  <dd className="font-medium text-slate-800">
                    {employee.hire_date ? `Embauché le ${formatLocalDate(employee.hire_date)}` : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">État du profil</dt>
                  <dd className="font-semibold text-emerald-700">Profil complet</dd>
                </div>
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">Niveau déclaré</dt>
                  <dd className="font-medium text-slate-800">{employee.declared_level_label}</dd>
                </div>
                <div className="flex items-baseline justify-between py-1.5">
                  <dt className="text-slate-500">Certificats déjà validés</dt>
                  <dd className="font-medium text-slate-800">
                    {employee.already_validated_certificates.length > 0
                      ? employee.already_validated_certificates.join(', ')
                      : 'Aucun pour le moment'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* 2. BLOC INFORMATIONS DU CERTIFICAT AVEC CORRECTION */}
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Informations du certificat
                </h2>
                {dirty && (
                  <button
                    type="button"
                    onClick={handleSaveCorrections}
                    disabled={savingFields}
                    className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[#1E1E82] hover:bg-slate-200 disabled:opacity-60"
                  >
                    {savingFields ? 'Enregistrement…' : 'Enregistrer la correction'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 text-xs">
                {/* Type */}
                <div>
                  <label htmlFor="field-type" className="mb-1 block font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    id="field-type"
                    value={formFields.certificate_type}
                    onChange={(e) => {
                      setFormFields({ ...formFields, certificate_type: e.target.value })
                      setDirty(true)
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-[#1E1E82] focus:outline-none"
                  >
                    <option value="DIPLOME">Diplôme</option>
                    <option value="CERTIFICAT">Certificat</option>
                    <option value="ATTESTATION">Attestation</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                {/* Niveau */}
                <div>
                  <label htmlFor="field-level" className="mb-1 block font-medium text-slate-700">
                    Niveau
                  </label>
                  <select
                    id="field-level"
                    value={formFields.level}
                    onChange={(e) => {
                      setFormFields({ ...formFields, level: e.target.value })
                      setDirty(true)
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-[#1E1E82] focus:outline-none"
                  >
                    <option value="FONDAMENTAL">Primaire / Fondamental</option>
                    <option value="SECONDAIRE">Secondaire</option>
                    <option value="BACCALAUREAT">Baccalauréat</option>
                    <option value="FORMATION_PRO">Formation professionnelle / Technique</option>
                    <option value="BAC_2">Technicien supérieur / Bac + 2</option>
                    <option value="LICENCE">Licence</option>
                    <option value="MASTER">Master</option>
                    <option value="DOCTORAT">Doctorat</option>
                    <option value="CERTIFICATION_PRO">Certification professionnelle</option>
                    <option value="FORMATION_CONTINUE">Formation continue / Attestation</option>
                  </select>
                  {certificate.original_level && (
                    <p className="mt-1 text-[11px] text-slate-500 italic">
                      Modifié par vous — valeur d'origine : {certificate.original_level}
                    </p>
                  )}
                </div>

                {/* Intitulé */}
                <div>
                  <label htmlFor="field-title" className="mb-1 block font-medium text-slate-700">
                    Intitulé
                  </label>
                  <input
                    id="field-title"
                    type="text"
                    value={formFields.title}
                    onChange={(e) => {
                      setFormFields({ ...formFields, title: e.target.value })
                      setDirty(true)
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-[#1E1E82] focus:outline-none"
                  />
                </div>

                {/* Établissement */}
                <div>
                  <label htmlFor="field-institution" className="mb-1 block font-medium text-slate-700">
                    Établissement
                  </label>
                  <input
                    id="field-institution"
                    type="text"
                    value={formFields.institution}
                    onChange={(e) => {
                      setFormFields({ ...formFields, institution: e.target.value })
                      setDirty(true)
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-[#1E1E82] focus:outline-none"
                  />
                </div>

                {/* Année */}
                <div>
                  <label htmlFor="field-year" className="mb-1 block font-medium text-slate-700">
                    Année
                  </label>
                  <input
                    id="field-year"
                    type="number"
                    value={formFields.year}
                    onChange={(e) => {
                      setFormFields({ ...formFields, year: Number.parseInt(e.target.value, 10) || 2020 })
                      setDirty(true)
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-[#1E1E82] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* 3. BLOC HISTORIQUE */}
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-bold tracking-wider text-[#1E1E82] uppercase">
                Historique du traitement
              </h2>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Déposé par l'employé — {formatDateTime(certificate.submitted_at)}
                  </span>
                </li>
                {history.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#1E1E82]" />
                    <span>
                      {h.details || h.action} — {formatDateTime(h.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* BARRE D'ACTIONS FIXÉE EN BAS (Maquette A04) */}
        <footer className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-end gap-4 border-t border-slate-200 bg-white/95 px-8 py-3.5 shadow-lg backdrop-blur sm:left-64">
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            disabled={deciding}
            className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-amber-600 px-5 text-xs font-semibold tracking-wide text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60"
          >
            Rejeter
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={deciding}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#15803D] px-6 text-xs font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-[#166534] disabled:opacity-60"
          >
            {deciding ? 'Validation…' : 'Valider'}
          </button>
        </footer>

        {rejectModalOpen && (
          <RejectionModal
            certificate={certificate}
            submitting={deciding}
            onCancel={() => setRejectModalOpen(false)}
            onConfirm={handleConfirmReject}
          />
        )}
      </div>
    </Page>
  )
}
