import { useEffect, useId, useRef, useState } from 'react'
import { resetAccess } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import { useUnauthorizedRedirect } from '../../lib/useLoader.js'
import Block from './Block.jsx'

export const RESET_DONE =
  "Accès réinitialisé. L'employé pourra créer un nouveau mot de passe à sa prochaine connexion."

/** Confirmation obligatoire, affichée dans le bloc (CA-07 : « Annuler » ne modifie rien). */
function Confirmation({ name, resetting, onConfirm, onCancel }) {
  const titleId = useId()
  const cancelRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    panelRef.current?.scrollIntoView?.({ block: 'center' })
    cancelRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={panelRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-detail`}
      onKeyDown={(event) => event.key === 'Escape' && !resetting && onCancel()}
      className="flex flex-col gap-3 rounded-lg border border-error-border bg-error-bg p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">Réinitialiser l'accès de {name}{' '}?</p>
        <p id={`${titleId}-detail`} className="text-sm text-help">
          Son mot de passe sera effacé et ses connexions en cours fermées. Son dossier et ses documents sont conservés.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={resetting}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={resetting}
          className="min-h-11 rounded-lg bg-error-text font-semibold text-white disabled:opacity-60"
        >
          {resetting ? 'Réinitialisation…' : 'Réinitialiser'}
        </button>
      </div>
    </div>
  )
}

/**
 * US-20 CA-07, US-22 : bloc « Accès » du dossier admin.
 * Compte activé → bouton « Réinitialiser l'accès » avec confirmation ; `onReset()` recharge le dossier.
 */
export default function ResetAccess({ employeeId, name, activated, onReset }) {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const buttonRef = useRef(null)
  const redirectIfUnauthorized = useUnauthorizedRedirect('/admin/connexion')

  function cancel() {
    setConfirming(false)
    setTimeout(() => buttonRef.current?.focus())
  }

  async function confirm() {
    setResetting(true)
    setError(null)
    try {
      await resetAccess(employeeId)
      setDone(true)
    } catch (caught) {
      if (redirectIfUnauthorized(caught)) return
      setError(caught.message)
    }
    setResetting(false)
    setConfirming(false)
    onReset()
  }

  return (
    <Block icon="key" title="Accès">
      <p className="flex items-center gap-2 text-heading">
        <span
          className={`material-symbols-outlined text-[20px] ${activated ? 'text-status-done-text' : 'text-muted'}`}
          aria-hidden="true"
        >
          {activated ? 'verified_user' : 'no_accounts'}
        </span>
        {activated ? 'Compte activé' : 'Compte non activé'}
      </p>
      <p className="text-sm text-help">
        {activated ? "L'employé a créé son mot de passe." : "L'employé n'a pas encore créé de mot de passe."}
      </p>
      {done && <Alert tone="success">{RESET_DONE}</Alert>}
      <Alert>{error}</Alert>
      {activated &&
        (confirming ? (
          <Confirmation name={name} resetting={resetting} onConfirm={confirm} onCancel={cancel} />
        ) : (
          <Button ref={buttonRef} variant="secondary" onClick={() => setConfirming(true)}>
            <span className="material-symbols-outlined" aria-hidden="true">lock_reset</span>
            Réinitialiser l'accès
          </Button>
        ))}
    </Block>
  )
}
