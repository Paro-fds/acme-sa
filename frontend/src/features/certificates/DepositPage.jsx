import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCertificateForm } from '../../api/certificates.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'
import { formatSize } from '../../lib/format.js'
import { resizeImage } from '../../lib/resizeImage.js'
import { useLoader } from '../../lib/useLoader.js'
import { CERTIFICATES_PATH } from './paths.js'
import { useDeposit } from './useDeposit.js'

async function load() {
  const [form, profile] = await Promise.all([getCertificateForm(), getProfile()])
  return { form, firstName: profile.first_name }
}

const ACCEPT = 'application/pdf,image/jpeg,image/png'
const EMPTY = {
  certificate_type: '',
  level: '',
  title: '',
  institution: '',
  year: '',
  foreign: false,
  country: '',
  domain: '',
  domain_other: '',
}

function Select({ label, value, onChange, options, error, aside }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-base font-semibold text-heading">
          {label}
        </label>
        {aside}
      </div>
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-lg border-[1.5px] bg-surface px-4 text-base text-heading ${
          error ? 'border-error-border bg-error-bg' : 'border-border-input'
        }`}
      >
        <option value="">Choisir…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-sm text-error-text">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  )
}

const TYPE_ICONS = { DIPLOME: 'school', CERTIFICAT: 'workspace_premium', ATTESTATION: 'description', AUTRE: 'more_horiz' }

/** Écran validé 11 : le type de document se choisit d'un geste, parmi 4 boutons. */
function TypeChoice({ options, value, onChange, error }) {
  const errorId = useId()
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-base font-semibold text-heading">Type de document</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 font-semibold has-[:focus-visible]:outline-2 ${
              value === option.value ? 'border-primary bg-primary text-white' : 'border-border-input bg-surface text-heading hover:bg-info-bg'
            }`}
          >
            <input
              type="radio"
              name="certificate_type"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="material-symbols-outlined" aria-hidden="true">{TYPE_ICONS[option.value] ?? 'description'}</span>
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm text-error-text">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** CA-01, CA-02 : photo ou fichier, réduite si c'est une photo, puis aperçu avant l'envoi. */
function FilePicker({ file, onFile, maxMb, error, progress }) {
  const cameraId = useId()
  const fileId = useId()
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function choose(event) {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    if (chosen) onFile(await resizeImage(chosen))
  }

  const button =
    'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-info-bg'
  return (
    <section aria-labelledby="file-title" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 id="file-title" className="text-lg font-semibold">
        Pièce justificative
      </h3>
      {file && (
        <section aria-label="Fichier choisi" className="flex items-center gap-3 rounded-lg bg-section p-3">
          {preview ? (
            <img src={preview} alt="Aperçu du certificat" className="size-16 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-info-bg text-info-text" aria-hidden="true">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold break-words text-heading">{file.name}</span>
            <span className="text-sm text-help">{formatSize(file.size)}</span>
          </span>
        </section>
      )}
      {progress !== null && (
        <div role="progressbar" aria-label="Envoi du fichier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-2 w-full overflow-hidden rounded-full bg-status-neutral-bg">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={cameraId} className={button}>
          <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
          Prendre une photo
        </label>
        <input id={cameraId} aria-label="Prendre une photo" type="file" accept="image/jpeg,image/png" capture="environment" onChange={choose} className="sr-only" />
        <label htmlFor={fileId} className={button}>
          <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
          Choisir un fichier
        </label>
        <input id={fileId} aria-label="Choisir un fichier" type="file" accept={ACCEPT} onChange={choose} className="sr-only" />
      </div>
      <p className="text-sm text-help">Formats acceptés : PDF, JPG ou PNG · {maxMb} Mo au plus</p>
      {error && (
        <p role="alert" className="flex items-center gap-1 text-sm text-error-text">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </section>
  )
}

function DepositForm({ form, firstName, depositing }) {
  const navigate = useNavigate()
  const { deposit, progress, error, fieldError } = depositing
  const [file, setFile] = useState(null)
  const [values, setValues] = useState(EMPTY)
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const level = form.levels.find((item) => item.value === values.level)

  async function handleSubmit(event) {
    event.preventDefault()
    const certificate = await deposit(file, values)
    if (certificate) {
      navigate(`${CERTIFICATES_PATH}/merci`, { state: { certificate, fileName: file.name, fileSize: file.size, firstName } })
    }
  }

  return (
    <form id="deposit" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Mascot role="Conseil carrière">
        « Bravo ! Votre profil est complet : déposez votre certificat pour le faire valider par les RH sous 5 jours ouvrables. »
      </Mascot>
      <FilePicker file={file} onFile={setFile} maxMb={form.max_mb} error={fieldError('file')} progress={progress} />

      <section aria-labelledby="fields-title" className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h3 id="fields-title" className="text-lg font-semibold">
          Informations sur le document
        </h3>
        <TypeChoice
          options={form.types}
          value={values.certificate_type}
          onChange={(type) => setValues((current) => ({ ...current, certificate_type: type }))}
          error={fieldError('certificate_type')}
        />
        <Select label="Niveau d'études associé" value={values.level} onChange={set('level')} options={form.levels} error={fieldError('level')} />
        {level && <p className="-mt-2 text-sm text-help">{level.examples}</p>}
        {level?.on_scale && (
          <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-sm text-info-text">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">verified</span>
            Une fois validé par les RH, votre niveau d'études deviendra {level.label}.
          </p>
        )}
        <TextField label="Intitulé exact" value={values.title} onChange={set('title')} error={fieldError('title')} />
        <TextField label="Établissement d'enseignement" value={values.institution} onChange={set('institution')} error={fieldError('institution')} />
        <TextField label="Année d'obtention" inputMode="numeric" maxLength={4} value={values.year} onChange={set('year')} error={fieldError('year')} />
        {level?.needs_domain && (
          <>
            <Select
              label="Domaine d'études"
              value={values.domain}
              onChange={set('domain')}
              options={form.domains}
              error={fieldError('domain')}
              aside={<span className="text-xs font-semibold text-help">Obligatoire dès Bac + 2</span>}
            />
            {values.domain === 'AUTRE' && (
              <TextField label="Précisez le domaine" value={values.domain_other} onChange={set('domain_other')} error={fieldError('domain_other')} />
            )}
          </>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={values.foreign}
            onChange={(event) => setValues((current) => ({ ...current, foreign: event.target.checked }))}
            className="size-5 accent-primary"
          />
          <span className="font-semibold text-heading">Diplôme obtenu à l'étranger</span>
        </label>
        {values.foreign && (
          <TextField label="Pays d'obtention" value={values.country} onChange={set('country')} error={fieldError('country')} />
        )}
      </section>

      {error && !error.field && <Alert>{error.message}</Alert>}
      <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-sm text-info-text">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">schedule</span>
        Les RH examinent et vérifient votre certificat sous 5 jours ouvrables.
      </p>
    </form>
  )
}

/** US-301, écran « Déposer un certificat » (prototype). */
export default function DepositPage() {
  const { data, error, loading } = useLoader(load)
  const depositing = useDeposit()
  const page = (children, actions) => (
    <Page account title="Déposer un certificat" backTo={CERTIFICATES_PATH} backLabel="Mes certificats" actions={actions}>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)
  return page(
    <DepositForm form={data.form} firstName={data.firstName} depositing={depositing} />,
    <Button type="submit" form="deposit" disabled={depositing.sending}>
      <span className="material-symbols-outlined" aria-hidden="true">send</span>
      {depositing.sending ? 'Envoi en cours…' : 'Envoyer mon certificat'}
    </Button>,
  )
}
