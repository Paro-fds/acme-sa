import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { listMyDocuments, uploadDocument } from '../../api/documents.js'
import { getMyUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Stepper from '../../components/Stepper.jsx'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import DocumentItem from './DocumentItem.jsx'
import { resizeImage } from './resizeImage.js'

export const MAX_FILE_MB = 5
export const MAX_DOCUMENTS = 10
const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const ACCEPTED_EXTENSION = /\.(pdf|jpe?g|png)$/i

const MESSAGES = {
  unsupported: 'Format non accepté. Utilisez un PDF, JPG ou PNG.',
  tooLarge: `Fichier trop volumineux (${MAX_FILE_MB} Mo maximum).`,
  limit: `Nombre maximum de documents atteint (${MAX_DOCUMENTS}).`,
  network: "L'envoi a échoué. Réessayez.",
  chooseType: 'Choisissez d’abord le type de document.',
}

const TYPES = [
  { code: 'DIPLOME', label: 'Diplôme', icon: 'school' },
  { code: 'CERTIFICAT', label: 'Certificat', icon: 'verified' },
  { code: 'ATTESTATION', label: 'Attestation', icon: 'description' },
  { code: 'AUTRE', label: 'Autre', icon: 'more_horiz' },
]

const loadStep = () => Promise.all([getMyUpdate(), listMyDocuments()])

function TypePicker({ value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-heading">Type de document</legend>
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map((type) => {
          const checked = value === type.code
          return (
            <label
              key={type.code}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                checked ? 'border-primary bg-primary text-white' : 'border-border bg-canvas text-help'
              }`}
            >
              <input
                type="radio"
                name="document_type"
                value={type.code}
                checked={checked}
                onChange={() => onChange(type.code)}
                className="sr-only"
              />
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{type.icon}</span>
              {type.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Bouton de choix de fichier : un `<label>` qui contient l'`<input type="file">` (accessible et testable). */
function PickButton({ icon, label, primary = false, disabled, onFile, capture }) {
  const inputRef = useRef(null)
  return (
    <label
      className={`flex min-h-13 items-center justify-center gap-3 rounded-xl px-4 font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
        disabled
          ? 'cursor-not-allowed bg-status-neutral-bg text-muted'
          : primary
            ? 'cursor-pointer bg-primary text-white hover:bg-primary-active'
            : 'cursor-pointer border-[1.5px] border-primary text-primary hover:bg-info-bg'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={capture ? 'image/jpeg,image/png' : ACCEPT}
        capture={capture}
        disabled={disabled}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const [file] = event.target.files
          // Réinitialiser permet de choisir de nouveau le même fichier.
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{icon}</span>
      {label}
    </label>
  )
}

function UploadProgress({ name, progress }) {
  const percent = Math.round(progress * 100)
  return (
    <div className="flex flex-col gap-1">
      <p className="truncate text-sm text-help">Envoi de {name}… {percent} %</p>
      <div
        role="progressbar"
        aria-label={`Envoi de ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-status-neutral-bg"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function DocumentsForm({ initialDocuments }) {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const [documents, setDocuments] = useState(initialDocuments)
  const [documentType, setDocumentType] = useState(null)
  const [upload, setUpload] = useState(null) // { name, progress }
  const [error, setError] = useState(null) // { message, retry? }
  const [limitReached, setLimitReached] = useState(initialDocuments.length >= MAX_DOCUMENTS)
  const [thumbnails, setThumbnails] = useState({})
  const thumbnailUrls = useRef([])

  useEffect(() => () => thumbnailUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const full = limitReached || documents.length >= MAX_DOCUMENTS
  const canPick = Boolean(documentType) && !full && !upload

  async function send(file, type) {
    setError(null)
    setUpload({ name: file.name, progress: 0 })
    try {
      const document = await uploadDocument(file, type, {
        onProgress: (progress) => setUpload({ name: file.name, progress }),
      })
      setDocuments((current) => [...current, document])
      if (file.type.startsWith('image/') && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(file)
        thumbnailUrls.current.push(url)
        setThumbnails((current) => ({ ...current, [document.id]: url }))
      }
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      if (apiError.code === 'UPDATE_ALREADY_SUBMITTED' || apiError.code === 'UPDATE_NOT_STARTED') {
        navigate('/profil', { replace: true })
        return
      }
      if (apiError.code === 'DOCUMENT_LIMIT_REACHED') setLimitReached(true)
      setError(
        apiError.status === 0
          ? { message: MESSAGES.network, retry: () => send(file, type) }
          : { message: apiError.message },
      )
    } finally {
      setUpload(null)
    }
  }

  async function handleFile(original) {
    setError(null)
    if (!ACCEPTED_EXTENSION.test(original.name)) {
      setError({ message: MESSAGES.unsupported })
      return
    }
    const file = await resizeImage(original)
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError({ message: MESSAGES.tooLarge })
      return
    }
    send(file, documentType)
  }

  const goToReview = () => navigate('/mise-a-jour/verification')

  return (
    <Page
      account
      title="Mise à jour"
      backTo="/mise-a-jour/informations"
      actions={
        <>
          <Button onClick={goToReview} disabled={Boolean(upload)}>
            Continuer vers la vérification
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </Button>
          <Button variant="subtle" onClick={goToReview} disabled={Boolean(upload)}>
            <span className="material-symbols-outlined" aria-hidden="true">skip_next</span>
            Passer cette étape
          </Button>
        </>
      }
    >
      <Stepper current="Documents" />

      <div className="flex items-start gap-3 rounded-xl border border-info-border bg-info-bg p-4">
        <span className="material-symbols-outlined text-info-text" aria-hidden="true">info</span>
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-heading">Justificatifs facultatifs</p>
          <p className="text-sm text-help">
            Vous pouvez joindre un diplôme, un certificat, une attestation ou un autre document. Si vous n'avez rien à
            ajouter, passez directement cette étape.
          </p>
        </div>
      </div>

      <section aria-labelledby="new-document-title" className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 id="new-document-title" className="flex items-center gap-2 text-lg font-semibold">
          <span className="material-symbols-outlined text-info-text" aria-hidden="true">add_circle</span>
          Nouveau document
        </h2>
        <TypePicker value={documentType} onChange={setDocumentType} />
        {!documentType && !full && <p className="text-sm text-help">{MESSAGES.chooseType}</p>}

        <div className="flex flex-col gap-2">
          <PickButton icon="photo_camera" label="Prendre une photo" primary capture="environment" disabled={!canPick} onFile={handleFile} />
          <PickButton icon="upload_file" label="Choisir un fichier du téléphone" disabled={!canPick} onFile={handleFile} />
        </div>

        {upload && <UploadProgress name={upload.name} progress={upload.progress} />}
        {full && <Alert tone="info">{MESSAGES.limit}</Alert>}
        {error && (
          <div className="flex flex-col gap-2">
            <Alert>{error.message}</Alert>
            {error.retry && (
              <Button variant="secondary" onClick={error.retry}>
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                Réessayer
              </Button>
            )}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-canvas p-3 text-sm text-help">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
          <span>Formats acceptés : PDF, JPG, PNG — {MAX_FILE_MB} Mo maximum</span>
        </p>
      </section>

      {documents.length > 0 && (
        <section aria-labelledby="added-documents-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 id="added-documents-title" className="text-lg font-semibold">Documents ajoutés</h2>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
              {documents.length} fichier{documents.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {documents.map((document) => (
              <DocumentItem key={document.id} document={document} thumbnail={thumbnails[document.id]} />
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}

/** US-13 : étape 2 « Documents » (facultative) du parcours de mise à jour. */
export default function DocumentsStep() {
  const { data, error, loading } = useLoader(loadStep)

  if (loading) return <Page account title="Mise à jour"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Mise à jour" backTo="/profil"><Alert>{error.message}</Alert></Page>

  const [update, documents] = data
  // Les documents se gèrent pendant la mise à jour seulement (D-04).
  if (update.state !== 'IN_PROGRESS') return <Navigate to="/profil" replace />
  return <DocumentsForm initialDocuments={documents} />
}
