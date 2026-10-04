import { useId } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { listMyDocuments } from '../../api/documents.js'
import { getMyUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Stepper from '../../components/Stepper.jsx'
import ValueComparison from '../../components/ValueComparison.jsx'
import { formatSize } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import { ConfirmationCheckbox, SubmitButton, useSubmission } from './SubmitSection.jsx'

const SECTIONS = [
  { code: 'IDENTITY', title: 'Identité modifiée' },
  { code: 'CONTACT', title: 'Coordonnées modifiées' },
]

const ICONS = {
  last_name: 'badge',
  first_name: 'badge',
  telephone_number: 'smartphone',
  email_address: 'mail',
  address_line_1: 'home_pin',
}

const plural = (count, singular, pluralForm) => `${count} ${count > 1 ? pluralForm : singular}`

const loadStep = () => Promise.all([getMyUpdate(), listMyDocuments()])

function Section({ title, badge, children }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
        <span className="rounded-full bg-status-neutral-bg px-2 py-0.5 text-xs font-semibold text-help">{badge}</span>
      </div>
      {children}
    </section>
  )
}

function ChangesSummary({ changes }) {
  if (changes.length === 0) {
    return (
      <Alert tone="info">
        Vous n'avez modifié aucune information. Vous pouvez confirmer que vos informations sont exactes.
      </Alert>
    )
  }
  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text" aria-hidden="true">
          <span className="material-symbols-outlined text-[20px]">sync</span>
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-heading">{plural(changes.length, 'modification en attente', 'modifications en attente')}</p>
          <p className="text-sm text-help">
            Ces modifications seront transmises à l'administration ACME pour mise à jour de votre dossier.
          </p>
        </div>
      </div>
      {SECTIONS.map((section) => {
        const sectionChanges = changes.filter((change) => change.section === section.code)
        if (sectionChanges.length === 0) return null
        return (
          <Section key={section.code} title={section.title} badge={plural(sectionChanges.length, 'champ', 'champs')}>
            {sectionChanges.map((change) => (
              <ValueComparison
                key={change.field_name}
                label={change.label}
                icon={ICONS[change.field_name]}
                oldValue={change.old_value}
                newValue={change.new_value}
              />
            ))}
          </Section>
        )
      })}
    </>
  )
}

function DocumentsSummary({ documents }) {
  return (
    <Section title="Justificatifs joints" badge="Optionnel">
      {documents.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-status-neutral-bg text-muted" aria-hidden="true">
            <span className="material-symbols-outlined">folder_off</span>
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-heading">Aucun document joint (optionnel)</p>
            <p className="text-sm text-help">Les justificatifs ne sont pas obligatoires.</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
                <span className="material-symbols-outlined">description</span>
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate font-semibold text-heading">{document.original_name}</p>
                <p className="text-sm text-help">
                  {document.type_label} · {formatSize(document.size_bytes)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

/** US-11 : étape 3 « Vérification » ; US-12 : confirmation et soumission. */
export default function ReviewStep() {
  const navigate = useNavigate()
  const { data, error: loadError, loading } = useLoader(loadStep)
  const submission = useSubmission()

  if (loading) return <Page account title="Mise à jour"><p role="status">Chargement…</p></Page>
  if (loadError) return <Page account title="Mise à jour" backTo="/profil"><Alert>{loadError.message}</Alert></Page>

  const [update, documents] = data
  // Mise à jour déjà soumise (US-12 CA-04) ou pas encore ouverte : retour au profil.
  if (update.state !== 'IN_PROGRESS') return <Navigate to="/profil" replace />

  return (
    <Page
      account
      title="Mise à jour"
      backTo="/mise-a-jour/informations"
      actions={
        <>
          <SubmitButton onClick={submission.submit} disabled={!submission.confirmed || submission.sending} />
          <Button variant="ghost" onClick={() => navigate('/mise-a-jour/informations')}>
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            Revenir en arrière et modifier
          </Button>
        </>
      }
    >
      <Stepper current="Vérification" />
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] leading-8 font-bold">Vérification avant soumission</h2>
        <p className="text-help">Vérifiez les modifications apportées à votre dossier avant de valider définitivement.</p>
      </div>

      <ChangesSummary changes={update.changes} />
      <DocumentsSummary documents={documents} />

      <ConfirmationCheckbox checked={submission.confirmed} onChange={submission.setConfirmed} />
      <Alert>{submission.error}</Alert>
    </Page>
  )
}
