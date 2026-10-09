import { useState } from 'react'
import { saveCoordinates } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'
import IdentityBlock from './IdentityBlock.jsx'
import { DossierProgress, FieldStatus, SectionHeading } from './SectionParts.jsx'
import { useDossierSection } from './useDossierSection.js'

const TITLE = 'Mes coordonnées'

function initialValues(dossier) {
  return {
    telephone: dossier.telephone.value ?? '',
    address: dossier.address.value ?? '',
    email: dossier.email.value ?? '',
    no_email: dossier.email.no_email,
  }
}

function CoordinatesForm({ section }) {
  const { dossier, save, saved, error, fieldError } = section
  const [values, setValues] = useState(() => initialValues(dossier))
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await save(() => saveCoordinates({ ...values, email: values.no_email ? '' : values.email }))
    if (result) setValues(initialValues(result))
  }

  return (
    <form id="coordinates" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <SectionHeading number={1} title={TITLE}>
        Mettez à jour vos informations de contact.
      </SectionHeading>
      <Mascot role="Guide carrière">« Vos coordonnées permettent aux RH et à votre agence de rester en contact direct avec vous. »</Mascot>
      <DossierProgress completion={dossier.completion} section="Section 1 sur 3 · Coordonnées personnelles" />
      <IdentityBlock />

      <section aria-labelledby="coordinates-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 id="coordinates-title" className="text-lg font-semibold text-heading">
            Coordonnées à renseigner
          </h3>
          <p className="text-sm text-help">Ces canaux seront utilisés pour vous contacter directement.</p>
        </div>

        <TextField
          label="Numéro de téléphone principal"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          icon="call"
          value={values.telephone}
          onChange={set('telephone')}
          help="8 chiffres, par exemple +509 3712 3456."
          labelAside={<FieldStatus {...dossier.telephone} error={fieldError('telephone')} />}
          error={fieldError('telephone')}
        />

        <TextField
          label="Adresse de résidence"
          required
          autoComplete="street-address"
          icon="home_pin"
          value={values.address}
          onChange={set('address')}
          placeholder="Ex. 12 rue Capois, Port-au-Prince"
          labelAside={<FieldStatus {...dossier.address} error={fieldError('address')} />}
          error={fieldError('address')}
        />

        <div className="flex flex-col gap-3">
          <TextField
            label="Adresse email"
            type="email"
            autoComplete="email"
            icon="mail"
            value={values.no_email ? '' : values.email}
            onChange={set('email')}
            disabled={values.no_email}
            help="Requise, ou cochez la case ci-dessous."
            labelAside={<FieldStatus {...dossier.email} error={fieldError('email')} />}
            error={fieldError('email')}
          />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-section p-3">
            <input
              type="checkbox"
              checked={values.no_email}
              onChange={(event) => setValues((current) => ({ ...current, no_email: event.target.checked }))}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span className="flex flex-col">
              <span className="font-medium text-heading">Je n'ai pas d'adresse email</span>
              <span className="text-sm text-help">Sans email, vous recevrez les notifications par WhatsApp.</span>
            </span>
          </label>
        </div>
      </section>

      {error && !error.field && <Alert>{error.message}</Alert>}
      {saved && (
        <p role="status" className="flex items-center gap-2 font-semibold text-status-done-text">
          <span className="material-symbols-outlined" aria-hidden="true">cloud_done</span>
          Enregistré dans votre profil.
        </p>
      )}
    </form>
  )
}

/** US-202, maquette 08 : section 1 / 3 « Mes coordonnées » (téléphone, adresse, email ou « pas d'adresse email »). */
export default function CoordinatesPage() {
  const section = useDossierSection()
  const page = (children, actions) => (
    <Page account title="Mon profil" backTo="/profil" backLabel="Mon profil" actions={actions}>
      {children}
    </Page>
  )

  if (section.loading) return page(<p role="status">Chargement…</p>)
  if (section.loadError) return page(<Alert>{section.loadError.message}</Alert>)
  return page(
    <CoordinatesForm section={section} />,
    <Button type="submit" form="coordinates" disabled={section.sending}>
      <span className="material-symbols-outlined" aria-hidden="true">save</span>
      {section.sending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>,
  )
}
