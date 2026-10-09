import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { saveContactAndEducation } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'
import { DossierProgress, FieldStatus, SectionHeading } from './SectionParts.jsx'
import { HR_INFORMATION_PATH } from './paths.js'
import { useDossierSection } from './useDossierSection.js'

/** Icône d'une partie du formulaire (écran validé 09) : carré bleu pâle de 36 px. */
function SectionIcon({ name }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-bg text-primary" aria-hidden="true">
      <span className="material-symbols-outlined text-xl">{name}</span>
    </span>
  )
}

function RelationshipSelect({ options, value, onChange, error }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-semibold text-heading">
        Lien avec vous
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full appearance-none rounded-lg border px-4 pr-10 text-base text-heading shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 ${
            error ? 'border-error-border bg-error-bg' : 'border-border-input bg-surface'
          }`}
        >
          <option value="">Choisir…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl text-muted"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">report_problem</span>
          {error}
        </p>
      )}
    </div>
  )
}

function EducationLevels({ levels, value, onChange, status, error }) {
  const titleId = useId()
  const errorId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="flex items-center gap-2 text-lg font-semibold text-heading">
          <SectionIcon name="school" />
          Niveau d'études
        </h3>
        {status}
      </div>
      <fieldset aria-describedby={error ? errorId : undefined} className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm text-help">Sélectionnez votre plus haut niveau d'études complété :</legend>
        {levels.map((level, index) => {
          const selected = value === level.value
          return (
            <label
              key={level.value}
              className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl p-2 transition-colors ${
                selected ? 'bg-highlight shadow-card' : 'bg-section hover:bg-info-bg'
              }`}
            >
              <input
                type="radio"
                name="education_level"
                value={level.value}
                checked={selected}
                onChange={() => onChange(level.value)}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={`flex items-center gap-1.5 text-sm ${selected ? 'font-bold text-primary' : 'font-semibold text-heading'}`}
                >
                  {index + 1}. {level.label}
                  {selected && (
                    <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                  )}
                </span>
                <span className="mt-1 text-sm text-help">{level.examples}</span>
              </span>
            </label>
          )
        })}
      </fieldset>
      {error && (
        <p id={errorId} className="flex items-start gap-2 rounded-lg bg-error-bg p-2.5 text-sm font-medium text-error-text">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-error-dot" aria-hidden="true">report_problem</span>
          {error}
        </p>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-info-bg p-2 text-sm text-help">
        <span className="material-symbols-outlined shrink-0 text-xl text-primary" aria-hidden="true">verified_user</span>
        Votre niveau sera confirmé par vos certificats validés dans « Mes certificats ».
      </p>
    </section>
  )
}

function ContactEducationForm({ section }) {
  const navigate = useNavigate()
  const { dossier, save, error, fieldError } = section
  const contact = dossier.emergency_contact
  const [values, setValues] = useState({
    contact_name: contact.name ?? '',
    contact_relationship: contact.relationship ?? '',
    contact_telephone: contact.telephone ?? '',
    education_level: dossier.education_level.value ?? '',
  })
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const contactError = ['contact_name', 'contact_relationship', 'contact_telephone'].some(fieldError)

  async function handleSubmit(event) {
    event.preventDefault()
    if (await save(() => saveContactAndEducation(values))) navigate(HR_INFORMATION_PATH)
  }

  return (
    <form id="contact-education" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <SectionHeading number={2} title="Contact d'urgence & études">
        Renseignez votre contact prioritaire et votre parcours académique.
      </SectionHeading>
      <Mascot role="Conseil carrière">
        « Ces renseignements protègent votre quotidien et valorisent vos compétences pour les promotions internes. »
      </Mascot>
      <DossierProgress completion={dossier.completion} section="Section 2 sur 3 · Contact et études" />

      <section aria-labelledby="contact-title" className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h3 id="contact-title" className="flex items-center gap-2 text-lg font-semibold text-heading">
            <SectionIcon name="shield_person" />
            Contact d'urgence
          </h3>
          <FieldStatus complete={contact.complete} value={null} error={contactError} />
        </div>
        <p className="flex items-center gap-2 rounded-lg bg-section p-2 text-sm text-help">
          <span className="material-symbols-outlined shrink-0 text-lg text-primary" aria-hidden="true">lock</span>
          Utilisé uniquement en cas d'urgence et pour vos droits aux assurances du personnel.
        </p>
        <TextField
          label="Nom complet de la personne à contacter"
          autoComplete="off"
          value={values.contact_name}
          onChange={set('contact_name')}
          error={fieldError('contact_name')}
        />
        <RelationshipSelect
          options={dossier.relationships}
          value={values.contact_relationship}
          onChange={set('contact_relationship')}
          error={fieldError('contact_relationship')}
        />
        <TextField
          label="Téléphone d'urgence"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={values.contact_telephone}
          onChange={set('contact_telephone')}
          help="8 chiffres, par exemple 4812 8901."
          error={fieldError('contact_telephone')}
        />
      </section>

      <EducationLevels
        levels={dossier.education_levels}
        value={values.education_level}
        onChange={(level) => setValues((current) => ({ ...current, education_level: level }))}
        status={<FieldStatus complete={dossier.education_level.complete} value={null} error={fieldError('education_level')} />}
        error={fieldError('education_level')}
      />

      {error && !error.field && <Alert>{error.message}</Alert>}
    </form>
  )
}

/** US-202, maquette 09 : section 2 / 3 « Contact d'urgence & études » (CA-04 : lien choisi dans une liste). */
export default function ContactEducationPage() {
  const section = useDossierSection()
  const page = (children, actions) => (
    <Page account title="Mon profil" backTo="/profil" backLabel="Mon profil" actions={actions}>
      {children}
    </Page>
  )

  if (section.loading) return page(<p role="status">Chargement…</p>)
  if (section.loadError) return page(<Alert>{section.loadError.message}</Alert>)
  return page(
    <ContactEducationForm section={section} />,
    <Button type="submit" form="contact-education" disabled={section.sending}>
      {section.sending ? 'Enregistrement…' : 'Enregistrer et continuer'}
      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </Button>,
  )
}
