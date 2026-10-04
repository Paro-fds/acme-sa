import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'

/** US-08 : réponse à « Souhaitez-vous mettre à jour votre dossier ? ». */
export default function DecisionCard({ onYes, onNo, sending = false, notice = null, error = null }) {
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onYes} disabled={sending}>
        <span className="material-symbols-outlined" aria-hidden="true">assignment_turned_in</span>
        Oui, mettre à jour mon dossier
      </Button>
      <Button variant="subtle" onClick={onNo} disabled={sending}>
        <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
        Non, consulter uniquement
      </Button>
      <Alert tone="success">{notice}</Alert>
      <Alert>{error}</Alert>
    </div>
  )
}
