import { useId, useState } from 'react'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import CodeBoxes from './CodeBoxes.jsx'
import LocalCodeBox from './LocalCodeBox.jsx'

const SIX_DIGITS = /^\d{6}$/

/**
 * Saisie d'un code à 6 chiffres (US-102 CA-02, CA-03), en 6 cases (US-107, écran A01).
 * `onSubmit(code)` : promesse ; une erreur `field: 'code'` s'affiche sous les cases, les autres au-dessus du bouton.
 * `onResend` : facultatif (WhatsApp, email) ; renvoie le nouveau code envoyé.
 */
export default function CodeForm({ instruction, sent, onSubmit, onResend, submitLabel = 'Vérifier', children }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [failure, setFailure] = useState(null)
  const [notice, setNotice] = useState(null)
  const [lastSent, setLastSent] = useState(sent)
  const [sending, setSending] = useState(false)
  const complete = SIX_DIGITS.test(code)
  const describedBy = [instruction && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    setFailure(null)
    try {
      await onSubmit(code)
    } catch (apiError) {
      setCode('')
      if (apiError.field === 'code') setError(apiError.message)
      else setFailure(apiError.message)
      setSending(false)
    }
  }

  async function handleResend() {
    setError(null)
    setFailure(null)
    try {
      setLastSent(await onResend())
      setNotice('Un nouveau code a été envoyé ; le précédent ne fonctionne plus.')
    } catch (apiError) {
      setFailure(apiError.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {children}
      <LocalCodeBox sent={lastSent} />
      <div className="flex flex-col gap-3">
        <label htmlFor={id} className="sr-only">
          Code de vérification
        </label>
        {instruction && (
          <p id={`${id}-help`} className="text-help">
            {instruction}
          </p>
        )}
        <CodeBoxes
          id={id}
          value={code}
          onChange={(value) => {
            setCode(value)
            setError(null)
          }}
          invalid={Boolean(error)}
          describedBy={describedBy}
        />
        {error && (
          <p id={`${id}-error`} className="flex items-center gap-1 text-sm text-error-text">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
            {error}
          </p>
        )}
        {onResend && (
          <button
            type="button"
            onClick={handleResend}
            className="min-h-11 w-fit font-semibold text-primary underline-offset-4 hover:underline"
          >
            Renvoyer le code
          </button>
        )}
      </div>
      <Alert tone="info">{notice}</Alert>
      <Alert>{failure}</Alert>
      <Button type="submit" disabled={!complete || sending}>
        {sending ? 'Vérification…' : submitLabel}
      </Button>
    </form>
  )
}
