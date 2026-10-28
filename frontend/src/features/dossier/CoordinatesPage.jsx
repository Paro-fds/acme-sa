import { useState } from 'react'
import { saveCoordinates } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import TextField from '../../components/TextField.jsx'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import IdentityBlock from './IdentityBlock.jsx'
import { DossierProgress, FieldStatus, SectionHeading } from './SectionParts.jsx'
import { useDossierSection } from './useDossierSection.js'

const TITLE = 'Mes coordonnées'
const PROGRESS_LABEL = 'Section 1 sur 3 · Coordonnées personnelles'
const TIP = 'Vos coordonnées permettent aux RH et à votre agence de rester en contact direct avec vous.'

function initialValues(dossier) {
  return { address: dossier.address.value ?? '' }
}

/** US-1011 : une coordonnée de Vault, que seule la DRH change. */
function ReadOnlyContact({ label, icon, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-section p-4">
      <span className="material-symbols-outlined text-muted" aria-hidden="true">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <dt className="text-sm text-help">{label}</dt>
        <dd className="font-semibold break-words text-heading">{value ?? 'Non renseigné'}</dd>
      </div>
      <span className="material-symbols-outlined text-muted" role="img" aria-label="Non modifiable">
        lock
      </span>
    </div>
  )
}

function CoordinatesForm({ section, desktop }) {
  const { dossier, save, saved, error, fieldError } = section
  const [values, setValues] = useState(() => initialValues(dossier))
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await save(() => saveCoordinates(values))
    if (result) setValues(initialValues(result))
  }

  return (
    <form id="coordinates" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <SectionHeading number={1} title={TITLE}>
        Vérifiez vos coordonnées et mettez à jour votre adresse.
      </SectionHeading>
      {!desktop && (
        <>
          <Tip>{TIP}</Tip>
          <DossierProgress completion={dossier.completion} section={PROGRESS_LABEL} />
          <IdentityBlock />
        </>
      )}

      <section aria-labelledby="coordinates-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 id="coordinates-title" className="text-lg font-semibold text-heading">
            Coordonnées à renseigner
          </h3>
          <p className="text-sm text-help">Ces canaux seront utilisés pour vous contacter directement.</p>
        </div>

        <div className="flex flex-col gap-3">
          <dl aria-label="Coordonnées enregistrées par la DRH" className="flex flex-col gap-3">
            <ReadOnlyContact label="Numéro de téléphone principal" icon="call" value={dossier.telephone.value} />
            <ReadOnlyContact label="Adresse email" icon="mail" value={dossier.email.value} />
          </dl>
          <p className="text-sm text-help">
            Ils servent à vous envoyer votre code de connexion. Pour les changer, adressez-vous à la DRH.
          </p>
        </div>

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

/**
 * US-202, maquette 08 : section 1 / 3 « Mes coordonnées ». US-1011 : téléphone et courriel de Vault en lecture seule,
 * seule l'adresse se modifie.
 * US-113 : sur ordinateur, progression, identité vérifiée et conseil dans la colonne de droite.
 */
export default function CoordinatesPage() {
  const section = useDossierSection()
  const desktop = useIsDesktop()
  const aside =
    desktop && section.dossier ? (
      <>
        <DossierProgress completion={section.dossier.completion} section={PROGRESS_LABEL} />
        <IdentityBlock />
        <Tip title="Pourquoi ces informations ?">{TIP}</Tip>
      </>
    ) : undefined
  const page = (children, actions) => (
    <Page account title="Mon dossier" backTo="/profil" backLabel="Mon dossier" actions={actions} aside={aside}>
      {children}
    </Page>
  )

  if (section.loading) return page(<p role="status">Chargement…</p>)
  if (section.loadError) return page(<Alert>{section.loadError.message}</Alert>)
  return page(
    <CoordinatesForm section={section} desktop={desktop} />,
    <Button type="submit" form="coordinates" disabled={section.sending}>
      <span className="material-symbols-outlined" aria-hidden="true">save</span>
      {section.sending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>,
  )
}
