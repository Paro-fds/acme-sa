import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getMyUpdate, submitUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Page from '../../components/Page.jsx'
import { displayValue } from '../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

/** US-11 / US-12 (version Walking Skeleton) : vérification, confirmation et soumission. */
export default function ReviewStep() {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const { data: update, error: loadError, loading } = useLoader(getMyUpdate)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    setSending(true)
    setError(null)
    try {
      await submitUpdate(true)
      navigate('/mise-a-jour/confirmation', { replace: true })
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError.message)
      setSending(false)
    }
  }

  if (loading) return <Page account title="Mise à jour"><p role="status">Chargement…</p></Page>
  if (loadError) return <Page account title="Mise à jour" backTo="/profil"><Alert>{loadError.message}</Alert></Page>

  return (
    <Page
      account
      title="Mise à jour"
      backTo="/mise-a-jour/informations"
      actions={
        <Button onClick={handleSubmit} disabled={!confirmed || sending}>
          Soumettre ma mise à jour
        </Button>
      }
    >
      <p className="text-sm font-semibold text-muted">Étape 3 sur 4 : Vérification</p>
      <h2 className="text-xl font-bold">Vérification avant soumission</h2>

      {update.changes.length === 0 ? (
        <Alert tone="info">
          Vous n'avez modifié aucune information. Vous pouvez confirmer que vos informations sont exactes.
        </Alert>
      ) : (
        update.changes.map((change) => (
          <Card key={change.field_name} title={change.label}>
            <p className="text-muted line-through">{displayValue(change.old_value)}</p>
            <p className="font-semibold text-heading">{change.new_value}</p>
          </Card>
        ))
      )}

      <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-primary"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span className="font-semibold text-heading">Je confirme que les informations fournies sont exactes et sincères.</span>
      </label>
      <Alert>{error}</Alert>
    </Page>
  )
}
