import { useNavigate } from 'react-router'
import { getMyUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { formatDateTime } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'

/** US-12 (version Walking Skeleton) : écran de confirmation après soumission. */
export default function ConfirmationStep() {
  const navigate = useNavigate()
  const { data: update, error, loading } = useLoader(getMyUpdate)

  if (loading) return <Page title="Confirmation"><p role="status">Chargement…</p></Page>
  if (error) return <Page title="Confirmation"><Alert>{error.message}</Alert></Page>

  return (
    <Page title="Confirmation" actions={<Button onClick={() => navigate('/profil')}>Retour à mon profil</Button>}>
      <p className="text-sm font-semibold text-muted">Étape 4 sur 4 : Confirmation</p>
      <Alert tone="success">Votre mise à jour a bien été transmise le {formatDateTime(update.submitted_at)}.</Alert>
      <p>Ces modifications seront transmises à l'administration ACME pour mise à jour de votre dossier.</p>
    </Page>
  )
}
