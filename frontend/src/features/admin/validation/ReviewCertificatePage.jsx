import { useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  correctCertificateFields,
  decideCertificate,
  getCertificateFileUrl,
  getCertificateReview,
} from '../../../api/validation.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatSize } from '../../../lib/format.js'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rh-strong/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-2xl">
        <div className="border-b border-rh-hover px-6 py-4">
          <h2 className="text-lg font-bold text-primary">Rejeter ce certificat</h2>
          <p className="text-xs font-medium text-rh-muted">
            {certificate.title} · {certificate.level}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-rh-strong">Motif du rejet (un seul)</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {MOTIFS_REJET.map((motif) => (
                  <label
                    key={motif}
                    className="flex cursor-pointer items-start gap-3 rounded p-1.5 transition-colors hover:bg-rh-canvas"
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
                      className="mt-0.5 size-4 text-primary focus:ring-0"
                    />
                    <span className="text-rh-strong">{motif}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reject-comment" className="mb-1 block text-sm font-semibold text-rh-strong">
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
                className="w-full rounded-lg border border-border-input p-2.5 text-sm text-rh-strong focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="rounded-lg border border-rh-line bg-rh-canvas p-3">
              <span className="block text-xs font-semibold text-rh-text uppercase">
                Aperçu de la notification
              </span>
              <p className="mt-1 text-xs text-rh-text">
                Votre certificat « {certificate.title} » n'a pas pu être validé ({reason.toLowerCase()}).{' '}
                {comment ? comment : 'Merci de vérifier votre document et de le soumettre à nouveau.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-rh-hover pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="min-h-11 rounded-lg px-4 font-semibold text-rh-text transition-colors hover:text-rh-strong"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-status-progress-text px-5 font-semibold text-white shadow-card transition-colors hover:bg-status-progress-text disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Confirmer le rejet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CARD = 'rounded-xl border border-rh-line bg-surface shadow-card'
const INPUT =
  'min-h-11 w-full rounded-lg border border-border-input bg-surface px-3 text-base text-rh-strong focus:border-primary focus:outline-none'
const dayMonth = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const longDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const nameInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

/** US-133 CA-07 : un champ de la déclaration, corrigeable. */
function Field({ label, children, wide = false }) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-1 ${wide ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={id} className="text-sm font-semibold text-rh-text">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

function Pill({ children }) {
  return <span className="rounded-full bg-rh-hover px-2.5 py-0.5 text-sm font-semibold text-rh-text">{children}</span>
}

/**
 * US-402 (écran A04), US-133 (refonte du 2026-10-19) : le document à gauche ; l'employé, ce qu'il a déclaré (corrigeable)
 * et la décision à droite.
 */
export default function ReviewCertificatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const titleId = useId()
  const employeeId = useId()
  const declaredId = useId()
  const decisionId = useId()

  const { data, loading, error } = useLoader(() => getCertificateReview(id), { key: id, loginPath: LOGIN_PATH })

  const [fields, setFields] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!data?.certificate) return
    const { certificate } = data
    setFields({
      certificate_type: certificate.certificate_type,
      level: certificate.level,
      title: certificate.title,
      institution: certificate.institution,
      year: certificate.year,
      domain: certificate.domain || '',
      country: certificate.country || '',
    })
    setDirty(false)
  }, [data])

  const set = (name, parse = (value) => value) => (event) => {
    setFields((current) => ({ ...current, [name]: parse(event.target.value) }))
    setDirty(true)
  }

  async function validate() {
    setActionError(null)
    setDeciding(true)
    try {
      if (dirty) await correctCertificateFields(id, fields)
      await decideCertificate(id, { decision: 'VALIDATED' })
      navigate('/admin/validation')
    } catch (err) {
      setActionError(err.message || 'Impossible de valider ce certificat.')
      setDeciding(false)
    }
  }

  async function reject({ reason, comment }) {
    setActionError(null)
    setDeciding(true)
    try {
      await decideCertificate(id, { decision: 'REJECTED', reason, comment })
      setRejecting(false)
      navigate('/admin/validation')
    } catch (err) {
      setActionError(err.message || 'Impossible de rejeter ce certificat.')
      setDeciding(false)
    }
  }

  const frame = (children) => (
    <Page account="admin" title="Examiner un certificat" backTo="/admin/validation" backLabel="File de validation" wide>
      {children}
    </Page>
  )

  if (loading) return frame(<p role="status" className="py-12 text-center text-rh-muted">Chargement du dossier…</p>)
  if (error) return frame(<Alert>{error.message}</Alert>)
  if (!fields) return frame(null)

  const { certificate, employee, files, business_days, choices } = data
  const file = files?.[0]
  const fileUrl = getCertificateFileUrl(id)
  const isImage = file?.content_type?.startsWith('image/')
  const overdue = business_days > 5
  const takenBy = data.assigned_to_me ? 'pris par vous' : certificate.assigned_to ? `pris par ${certificate.assigned_to}` : 'non assigné'
  const validatedCount = employee.already_validated_certificates.length

  return frame(
    <div className="flex flex-col gap-6">
      <section aria-labelledby={titleId} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id={titleId} className="text-[26px] leading-8 font-extrabold tracking-tight break-words text-primary-active lg:text-[30px] lg:leading-9">
            {certificate.title}
          </h2>
          <p className="text-rh-text">
            Déposé par {employee.name} le {longDate(certificate.submitted_at)} · {takenBy}
          </p>
        </div>
        <span
          className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${
            overdue
              ? 'border-status-progress-border bg-status-progress-bg text-status-progress-text'
              : 'border-info-border bg-info-bg text-info-text'
          }`}
        >
          {overdue
            ? `En retard · ${business_days} j`
            : `Jour ${Math.max(business_days, 1)} sur 5${data.decide_by ? ` · décision avant le ${dayMonth(data.decide_by)}` : ''}`}
        </span>
      </section>

      {actionError && <Alert>{actionError}</Alert>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="Document déposé" className={`${CARD} flex flex-col overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rh-line bg-rh-canvas px-4 py-2">
            <span className="text-sm font-semibold text-rh-text">
              {file ? `${file.original_name} · ${formatSize(file.size_bytes)}` : 'Document'}
            </span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
              Ouvrir en grand
            </a>
          </div>
          <div className="flex min-h-[420px] items-center justify-center bg-rh-hover p-4 lg:min-h-[600px]">
            {isImage ? (
              <img
                src={fileUrl}
                alt={`Certificat de ${employee.name}`}
                className="max-h-[600px] w-auto max-w-full rounded border border-border-input bg-surface object-contain shadow-card"
              />
            ) : (
              <iframe src={fileUrl} title={`Certificat de ${employee.name}`} className="h-[600px] w-full rounded border border-border-input bg-surface" />
            )}
          </div>
        </section>

        <aside aria-label="Vérification et décision" className="flex flex-col gap-5">
          <section aria-labelledby={employeeId} className={`${CARD} flex flex-col gap-3 p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden="true">
                {nameInitials(employee.name)}
              </span>
              <div className="flex min-w-0 flex-col">
                <h3 id={employeeId} className="text-lg font-bold break-words text-rh-strong">
                  {employee.name}
                </h3>
                <span className="text-sm text-rh-text">
                  {[employee.employee_code, employee.position, employee.agency_name].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {employee.is_profile_complete && <Pill>Profil complet</Pill>}
              <Pill>Niveau validé : {employee.validated_level_label ?? 'aucun'}</Pill>
              <Pill>
                {validatedCount} certificat{validatedCount > 1 ? 's' : ''} déjà validé{validatedCount > 1 ? 's' : ''}
              </Pill>
            </div>
          </section>

          <section aria-labelledby={declaredId} className={`${CARD} flex flex-col gap-3 p-5`}>
            <div className="flex flex-col gap-0.5">
              <h3 id={declaredId} className="text-lg font-bold text-rh-strong">
                Ce que l’employé a déclaré
              </h3>
              <p className="text-sm text-rh-muted">Comparez avec le document ; corrigez si besoin.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Type">
                {(fieldId) => (
                  <select id={fieldId} value={fields.certificate_type} onChange={set('certificate_type')} className={INPUT}>
                    {choices.types.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Année">
                {(fieldId) => (
                  <input
                    id={fieldId}
                    type="number"
                    value={fields.year}
                    onChange={set('year', (value) => Number.parseInt(value, 10) || '')}
                    className={INPUT}
                  />
                )}
              </Field>
              <Field label="Niveau" wide>
                {(fieldId) => (
                  <>
                    <select id={fieldId} value={fields.level} onChange={set('level')} className={INPUT}>
                      {choices.levels.map((choice) => (
                        <option key={choice.value} value={choice.value}>{choice.label}</option>
                      ))}
                    </select>
                    {certificate.original_level && (
                      <p className="text-sm text-rh-muted">Corrigé ; valeur d’origine : {certificate.original_level}</p>
                    )}
                  </>
                )}
              </Field>
              <Field label="Domaine" wide>
                {(fieldId) => (
                  <select id={fieldId} value={fields.domain} onChange={set('domain')} className={INPUT}>
                    <option value="">Aucun</option>
                    {choices.domains.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Établissement" wide>
                {(fieldId) => <input id={fieldId} value={fields.institution} onChange={set('institution')} className={INPUT} />}
              </Field>
              <Field label="Intitulé" wide>
                {(fieldId) => <input id={fieldId} value={fields.title} onChange={set('title')} className={INPUT} />}
              </Field>
            </div>
          </section>

          <section aria-labelledby={decisionId} className={`${CARD} flex flex-col gap-3 p-5`}>
            <h3 id={decisionId} className="text-lg font-bold text-rh-strong">
              Votre décision
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={validate}
                disabled={deciding}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-status-done-text px-4 font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <span className="material-symbols-outlined" aria-hidden="true">check</span>
                Valider
              </button>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={deciding}
                className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-status-progress-dot px-4 font-semibold text-status-progress-text hover:bg-status-progress-bg disabled:opacity-60"
              >
                Rejeter…
              </button>
            </div>
            <p className="text-sm text-rh-muted">L’employé est prévenu dans PAM. Un rejet demande un motif, choisi dans la liste.</p>
          </section>
        </aside>
      </div>

      {rejecting && <RejectionModal certificate={certificate} submitting={deciding} onCancel={() => setRejecting(false)} onConfirm={reject} />}
    </div>,
  )
}
