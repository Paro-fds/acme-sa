import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { getEditableFields, getProfile, saveChanges } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Stepper from '../../components/Stepper.jsx'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import FieldCard from './FieldCard.jsx'
import FormSection from './FormSection.jsx'
import { isModified, validate } from './fieldRules.js'

// Étape suivante : les documents (étape 2) arrivent avec US-13 ; d'ici là, la vérification.
const NEXT_STEP = { path: '/mise-a-jour/verification', label: 'Continuer vers la vérification' }

const SECTIONS = [
  { code: 'IDENTITY', title: 'Identité', icon: 'person' },
  { code: 'CONTACT', title: 'Coordonnées', icon: 'contacts' },
]

const loadStep = () => Promise.all([getEditableFields(), getProfile()])

function ReadOnlySection({ profile }) {
  return (
    <section aria-labelledby="pro-title" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-neutral-bg text-muted" aria-hidden="true">
          <span className="material-symbols-outlined text-[20px]">lock</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="pro-title" className="text-lg font-semibold">Informations professionnelles</h2>
            <span className="rounded bg-status-neutral-bg px-2 py-0.5 text-xs font-semibold text-help">Lecture seule</span>
          </div>
          <p className="text-sm text-help">Modifiables uniquement par l'administration.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-canvas p-3">
        <div>
          <dt className="text-xs font-semibold text-muted">Poste</dt>
          <dd className="font-semibold text-heading">{profile.position || 'Non renseigné'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Matricule</dt>
          <dd className="font-semibold text-heading">{profile.employee_code}</dd>
        </div>
      </dl>
    </section>
  )
}

function InformationsForm({ fields, profile }) {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.code, field.value])))
  const [touched, setTouched] = useState({})
  const [serverError, setServerError] = useState(null)
  const [sending, setSending] = useState(false)

  // Seules les valeurs saisies par l'employé sont validées et envoyées : une valeur d'origine
  // non conforme (format du CSV) ne bloque pas l'employé s'il n'y touche pas.
  const modified = (field) => isModified(field, values[field.code])
  const errors = Object.fromEntries(
    fields.map((field) => [field.code, modified(field) ? validate(field, values[field.code]) : null]),
  )
  const hasErrors = Object.values(errors).some(Boolean)

  function fieldError(code) {
    if (serverError?.field === code) return serverError.message
    return touched[code] ? errors[code] : null
  }

  function change(code, value) {
    setValues({ ...values, [code]: value })
    if (serverError?.field === code) setServerError(null)
  }

  async function handleContinue() {
    if (hasErrors || sending) return
    setSending(true)
    setServerError(null)
    try {
      // Un champ déjà modifié dans le brouillon est renvoyé même s'il est revenu à sa valeur
      // d'origine : le serveur supprime alors le changement (CA-04).
      const toSend = fields.filter((field) => modified(field) || field.modified)
      await saveChanges(Object.fromEntries(toSend.map((field) => [field.code, values[field.code]])))
      navigate(NEXT_STEP.path)
    } catch (apiError) {
      setSending(false)
      if (apiError.code === 'UPDATE_NOT_STARTED' || apiError.code === 'UPDATE_ALREADY_SUBMITTED') {
        navigate('/profil', { replace: true })
        return
      }
      if (!redirectIfUnauthorized(apiError)) setServerError(apiError)
    }
  }

  return (
    <Page
      account
      title="Mise à jour"
      backTo="/profil"
      actions={
        <Button onClick={handleContinue} disabled={hasErrors || sending}>
          {NEXT_STEP.label}
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Button>
      }
    >
      <Stepper current="Informations" />

      {SECTIONS.map((section) => {
        const sectionFields = fields.filter((field) => field.section === section.code)
        const changes = sectionFields.filter(modified).length
        return (
          <FormSection key={section.code} icon={section.icon} title={section.title} changes={changes}>
            {sectionFields.map((field) => (
              <FieldCard
                key={field.code}
                field={field}
                value={values[field.code]}
                modified={modified(field)}
                error={fieldError(field.code)}
                onChange={(value) => change(field.code, value)}
                onBlur={() => setTouched({ ...touched, [field.code]: true })}
              />
            ))}
          </FormSection>
        )
      })}

      <ReadOnlySection profile={profile} />
      <Alert>{serverError && !serverError.field ? serverError.message : null}</Alert>
    </Page>
  )
}

/** US-09 : étape 1 « Informations » du parcours de mise à jour. */
export default function InformationsStep() {
  const { data, error, loading } = useLoader(loadStep)

  if (loading) return <Page account title="Mise à jour"><p role="status">Chargement…</p></Page>
  // Pas de « Oui » préalable (ou mise à jour déjà soumise) : retour au profil (CA-09).
  if (error?.status === 409) return <Navigate to="/profil" replace />
  if (error) return <Page account title="Mise à jour" backTo="/profil"><Alert>{error.message}</Alert></Page>

  const [fields, profile] = data
  return <InformationsForm fields={fields} profile={profile} />
}
