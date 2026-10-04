import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { submitUpdate } from '../../api/employee.js'
import Button from '../../components/Button.jsx'
import { useUnauthorizedRedirect } from '../../lib/useLoader.js'

const CONFIRMATION_PATH = '/mise-a-jour/confirmation'

/**
 * US-12 : confirmation et soumission définitive.
 * Un seul envoi à la fois (CA-06) ; si le serveur répond que la mise à jour est déjà soumise
 * (deuxième envoi), l'écran de confirmation s'affiche normalement.
 */
export function useSubmission() {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const [confirmed, setConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  // Verrou synchrone : le second clic d'un double clic arrive avant le nouveau rendu.
  const inFlight = useRef(false)

  async function submit() {
    if (!confirmed || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setError(null)
    try {
      await submitUpdate(true)
      navigate(CONFIRMATION_PATH, { replace: true })
    } catch (apiError) {
      if (apiError.code === 'UPDATE_ALREADY_SUBMITTED') {
        navigate(CONFIRMATION_PATH, { replace: true })
        return
      }
      inFlight.current = false
      setSending(false)
      if (!redirectIfUnauthorized(apiError)) setError(apiError.message)
    }
  }

  return { confirmed, setConfirmed, sending, error, submit }
}

export function ConfirmationCheckbox({ checked, onChange }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <input
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby="confirmation-warning"
      />
      <span className="flex flex-col gap-1">
        <span className="font-semibold text-heading">Je confirme que les informations fournies sont exactes et sincères.</span>
        <span id="confirmation-warning" className="text-sm text-help">
          Après la soumission, votre mise à jour ne pourra plus être modifiée.
        </span>
      </span>
    </label>
  )
}

export function SubmitButton({ onClick, disabled }) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      Soumettre ma mise à jour
      <span className="material-symbols-outlined" aria-hidden="true">send</span>
    </Button>
  )
}
