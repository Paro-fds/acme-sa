import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import TextField from '../../components/TextField.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { hrMessage } from './certificatesParts.jsx'
import { CERTIFICATES_PATH } from './paths.js'
import FilePicker from './FilePicker.jsx'
import { useDeposit } from './useDeposit.js'

/** US-130 CA-06 : seul un certificat « À corriger » non archivé se renvoie ; sinon `refused`. */
async function load(replaceId) {
  const [form, profile, mine] = await Promise.all([getCertificateForm(), getProfile(), replaceId ? listCertificates() : null])
  const replacing = mine?.certificates.find((c) => c.id === replaceId && c.status === 'TO_CORRECT' && !c.is_archived) ?? null
  return { form, firstName: profile.first_name, replacing, refused: Boolean(replaceId) && !replacing }
}

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

/** US-130 CA-06 : le formulaire repart des informations du certificat à corriger ; seul le fichier est à choisir de nouveau. */
function initialValues(certificate) {
  if (!certificate) return EMPTY
  return {
    certificate_type: certificate.certificate_type,
    level: certificate.level,
    title: certificate.title,
    institution: certificate.institution,
    year: String(certificate.year),
    foreign: Boolean(certificate.country),
    country: certificate.country ?? '',
    domain: certificate.domain ?? '',
    domain_other: certificate.domain === 'AUTRE' ? (certificate.domain_label ?? '') : '',
  }
}

/** US-130 CA-06 : ce que les RH ont demandé de corriger, rappelé en haut du formulaire. */
function CorrectionReminder({ certificate }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-xl bg-error-bg p-4 text-error-text">
      <h3 id={titleId} className="text-lg font-semibold">
        Vous corrigez « {certificate.title} »
      </h3>
      {hrMessage(certificate) && (
        <p className="leading-relaxed">
          <strong>Message des RH :</strong> {hrMessage(certificate)}
        </p>
      )}
      <p className="text-sm">Choisissez un nouveau fichier et corrigez ce qui doit l’être. L’ancien reste conservé comme preuve.</p>
    </section>
  )
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

function DepositForm({ form, firstName, replacing, depositing }) {
  const navigate = useNavigate()
  const { deposit, progress, error, fieldError } = depositing
  const [file, setFile] = useState(null)
  const [values, setValues] = useState(() => initialValues(replacing))
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const level = form.levels.find((item) => item.value === values.level)

  async function handleSubmit(event) {
    event.preventDefault()
    const certificate = await deposit(file, values, replacing?.id ?? null)
    if (certificate) {
      navigate(`${CERTIFICATES_PATH}/merci`, { state: { certificate, fileName: file.name, fileSize: file.size, firstName } })
    }
  }

  return (
    <form id="deposit" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {replacing ? (
        <CorrectionReminder certificate={replacing} />
      ) : (
        <Tip>Bravo ! Votre profil est complet : déposez votre certificat pour le faire valider par les RH sous 5 jours ouvrables.</Tip>
      )}
      <FilePicker file={file} onFile={setFile} maxMb={form.max_mb} error={fieldError('file')} progress={progress} />

      <section aria-labelledby="fields-title" className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card">
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

/** US-301, écran « Déposer un certificat » (prototype) ; US-130 : « Corriger un certificat » avec `?remplace=<id>`. */
export default function DepositPage() {
  const [params] = useSearchParams()
  const replaceId = params.get('remplace')
  const { data, error, loading } = useLoader(() => load(replaceId))
  const depositing = useDeposit()
  const page = (children, actions) => (
    <Page
      account
      title={replaceId ? 'Corriger un certificat' : 'Déposer un certificat'}
      backTo={CERTIFICATES_PATH}
      backLabel="Mes certificats"
      actions={actions}
    >
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)
  if (data.refused) {
    return page(
      <>
        <Alert>Ce certificat ne peut plus être renvoyé : il a déjà été corrigé ou décidé.</Alert>
        <Link to={CERTIFICATES_PATH} className="flex min-h-11 w-fit items-center font-semibold text-primary hover:underline">
          Retour à mes certificats
        </Link>
      </>,
    )
  }
  return page(
    <DepositForm form={data.form} firstName={data.firstName} replacing={data.replacing} depositing={depositing} />,
    <Button type="submit" form="deposit" disabled={depositing.sending}>
      <span className="material-symbols-outlined" aria-hidden="true">send</span>
      {depositing.sending ? 'Envoi en cours…' : data.replacing ? 'Renvoyer mon certificat' : 'Envoyer mon certificat'}
    </Button>,
  )
}
