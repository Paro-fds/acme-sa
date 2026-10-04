import { useId } from 'react'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import { EmployeeStateBadge } from '../../components/StatusBadge.jsx'
import { formatDateTime } from '../../lib/format.js'
import DecisionCard from './DecisionCard.jsx'

const CONTENT = {
  NOT_DONE: {
    icon: 'contact_page',
    iconBox: 'bg-status-neutral-bg text-status-neutral-text',
    title: 'Souhaitez-vous mettre à jour votre dossier ?',
    text: () =>
      "Vous pouvez vérifier et corriger vos informations en ligne. L'ajout de justificatifs est facultatif.",
  },
  IN_PROGRESS: {
    icon: 'edit_note',
    iconBox: 'bg-status-progress-bg text-status-progress-text',
    title: 'Vous avez une mise à jour en cours',
    text: (update) => `Dernière sauvegarde le ${formatDateTime(update.updated_at)}`,
  },
  DONE: {
    icon: 'task_alt',
    iconBox: 'bg-status-done-bg text-status-done-text',
    title: 'Votre dossier est à jour',
    text: (update) => `Mise à jour soumise le ${formatDateTime(update.submitted_at)}`,
  },
}

/**
 * US-06 : carte d'état de la mise à jour en haut du profil.
 * NOT_DONE → question Oui/Non (US-08) ; IN_PROGRESS → « Reprendre » ; DONE → aucune action.
 * `notice` et `error` : retour de la dernière action (réponse « Non », erreur réseau…).
 */
export default function UpdateStateCard({ update, onYes, onNo, onResume, sending = false, notice = null, error = null }) {
  const titleId = useId()
  const { icon, iconBox, title, text } = CONTENT[update.state] ?? CONTENT.NOT_DONE

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBox}`} aria-hidden="true">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id={titleId} className="text-lg leading-snug font-semibold">{title}</h2>
          <EmployeeStateBadge state={update.state} />
          <p className="text-sm text-help">{text(update)}</p>
        </div>
      </div>

      {update.state === 'IN_PROGRESS' && (
        <Button onClick={onResume}>
          <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
          Reprendre la mise à jour
        </Button>
      )}
      {update.state === 'NOT_DONE' ? (
        <DecisionCard onYes={onYes} onNo={onNo} sending={sending} notice={notice} error={error} />
      ) : (
        <Alert>{error}</Alert>
      )}
    </section>
  )
}
