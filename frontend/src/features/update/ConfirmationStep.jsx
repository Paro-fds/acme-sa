import { Navigate, useNavigate } from 'react-router'
import { getMyUpdate, getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Stepper from '../../components/Stepper.jsx'
import { formatDateTime } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'

const loadStep = () => Promise.all([getMyUpdate(), getProfile()])

function ReceiptRow({ icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="flex items-center gap-1.5 text-sm text-help">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="text-right font-semibold text-heading">{children}</dd>
    </div>
  )
}

/** US-12 : étape 4 « Confirmation », affichée après la soumission. */
export default function ConfirmationStep() {
  const navigate = useNavigate()
  const { data, error, loading } = useLoader(loadStep)

  if (loading) return <Page account title="Confirmation"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Confirmation" backTo="/profil"><Alert>{error.message}</Alert></Page>

  const [update, profile] = data
  // Pas encore soumise : rien à confirmer.
  if (update.state !== 'DONE') return <Navigate to="/profil" replace />
  const count = update.changes.length

  return (
    <Page
      account
      title="Confirmation"
      actions={
        <Button onClick={() => navigate('/profil')}>
          Retour à mon profil
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Button>
      }
    >
      <Stepper current="Confirmation" />

      <section className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-card">
        <span className="flex size-16 items-center justify-center rounded-full bg-status-done-bg" aria-hidden="true">
          <span className="flex size-12 items-center justify-center rounded-full bg-status-done-dot text-white">
            <span className="material-symbols-outlined text-[28px]">done_all</span>
          </span>
        </span>
        <h2 className="text-[22px] leading-7 font-bold">Votre mise à jour a bien été transmise</h2>
        <p className="max-w-sm text-help">
          Vos informations ont été enregistrées. L'administration ACME pourra les consulter pour mettre à jour votre dossier.
        </p>
      </section>

      <section aria-labelledby="receipt-title" className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
          <h3 id="receipt-title" className="font-semibold text-heading">Accusé d'enregistrement</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-done-border bg-status-done-bg px-2.5 py-0.5 text-xs font-semibold text-status-done-text">
            <span className="size-2 rounded-full bg-status-done-dot" aria-hidden="true" />
            Soumise
          </span>
        </div>
        <dl className="divide-y divide-border px-1 pt-1">
          <ReceiptRow icon="calendar_today" label="Date et heure">{formatDateTime(update.submitted_at)}</ReceiptRow>
          <ReceiptRow icon="edit_note" label="Modifications">
            {count === 0 ? 'Aucune (informations confirmées)' : `${count} information${count > 1 ? 's' : ''}`}
          </ReceiptRow>
          <ReceiptRow icon="location_on" label="Agence">{profile.agency_code}</ReceiptRow>
        </dl>
      </section>

      <Alert tone="info">Une erreur ou un changement ? Vous pourrez modifier à nouveau votre dossier depuis votre profil.</Alert>
    </Page>
  )
}
