import { useEffect, useId, useRef, useState } from 'react'
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
  REOPENED: {
    icon: 'edit_note',
    iconBox: 'bg-status-progress-bg text-status-progress-text',
    title: 'Vous modifiez votre dossier',
    text: (update) =>
      `Dernier envoi le ${formatDateTime(update.submitted_at)}. L'administration voit cette version jusqu'à votre nouvel envoi.`,
  },
  DONE: {
    icon: 'task_alt',
    iconBox: 'bg-status-done-bg text-status-done-text',
    title: 'Votre dossier est à jour',
    text: (update) => `Mise à jour envoyée le ${formatDateTime(update.submitted_at)}`,
  },
}

/** US-24 CA-05 : confirmation avant d'effacer la nouvelle modification. */
function DiscardConfirmation({ sending, onConfirm, onCancel }) {
  const titleId = useId()
  const keepRef = useRef(null)

  useEffect(() => {
    keepRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-detail`}
      onKeyDown={(event) => event.key === 'Escape' && !sending && onCancel()}
      className="flex flex-col gap-3 rounded-lg border border-error-border bg-error-bg p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">Annuler vos modifications{' '}?</p>
        <p id={`${titleId}-detail`} className="text-sm text-help">
          Les changements faits depuis votre dernier envoi seront effacés. Votre dernier envoi est conservé.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={keepRef}
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Continuer
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={sending}
          className="min-h-11 rounded-lg bg-error-text font-semibold text-white disabled:opacity-60"
        >
          {sending ? 'Annulation…' : 'Tout annuler'}
        </button>
      </div>
    </div>
  )
}

/**
 * US-06 : carte d'état de la mise à jour en haut du profil.
 * NOT_DONE → question Oui/Non (US-08) ; IN_PROGRESS → « Reprendre » ; DONE → « Modifier à nouveau » (US-24) ;
 * modification après un envoi → « Reprendre la modification » et « Annuler les modifications » (US-24).
 * `notice` et `error` : retour de la dernière action (réponse « Non », erreur réseau…).
 */
export default function UpdateStateCard({
  update,
  onYes,
  onNo,
  onResume,
  onReopen,
  onDiscard,
  sending = false,
  notice = null,
  error = null,
}) {
  const titleId = useId()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const reopened = update.state === 'IN_PROGRESS' && update.reopened
  const { icon, iconBox, title, text } = CONTENT[reopened ? 'REOPENED' : update.state] ?? CONTENT.NOT_DONE

  useEffect(() => {
    if (!reopened) setConfirmingDiscard(false)
  }, [reopened])

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
        <Button onClick={onResume} disabled={sending}>
          <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
          {reopened ? 'Reprendre la modification' : 'Reprendre la mise à jour'}
        </Button>
      )}
      {reopened &&
        (confirmingDiscard ? (
          <DiscardConfirmation sending={sending} onConfirm={onDiscard} onCancel={() => setConfirmingDiscard(false)} />
        ) : (
          <Button variant="subtle" onClick={() => setConfirmingDiscard(true)} disabled={sending}>
            <span className="material-symbols-outlined" aria-hidden="true">undo</span>
            Annuler les modifications
          </Button>
        ))}
      {update.state === 'DONE' && (
        <Button variant="secondary" onClick={onReopen} disabled={sending}>
          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
          {sending ? 'Ouverture…' : 'Modifier à nouveau'}
        </Button>
      )}
      {update.state === 'NOT_DONE' ? (
        <DecisionCard onYes={onYes} onNo={onNo} sending={sending} notice={notice} error={error} />
      ) : (
        <>
          {notice && <Alert tone="success">{notice}</Alert>}
          <Alert>{error}</Alert>
        </>
      )}
    </section>
  )
}
