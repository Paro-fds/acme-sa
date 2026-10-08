import { useState } from 'react'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import TextField from '../../../components/TextField.jsx'
import DemoCodeBox from './DemoCodeBox.jsx'

const SIX_DIGITS = /^\d{6}$/

/**
 * Saisie d'un code à 6 chiffres (US-102 CA-02, CA-03).
 * `onSubmit(code)` : promesse ; une erreur `field: 'code'` s'affiche sous le champ, les autres au-dessus du bouton.
 * `onResend` : facultatif (WhatsApp, email) ; renvoie le nouveau code envoyé.
 */
export default function CodeForm({ instruction, sent, onSubmit, onResend, submitLabel = 'Vérifier', children }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [failure, setFailure] = useState(null)
  const [notice, setNotice] = useState(null)
  const [lastSent, setLastSent] = useState(sent)
  const [sending, setSending] = useState(false)
  const complete = SIX_DIGITS.test(code)

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
      <DemoCodeBox sent={lastSent} />
      <TextField
        label="Code de vérification"
        help={instruction}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
          setError(null)
        }}
        error={error}
        className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-[0.4em]"
      />
      <Alert tone="info">{notice}</Alert>
      <Alert>{failure}</Alert>
      <Button type="submit" disabled={!complete || sending}>
        {sending ? 'Vérification…' : submitLabel}
      </Button>
      {onResend && (
        <Button variant="ghost" onClick={handleResend}>
          <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
          Renvoyer le code
        </Button>
      )}
    </form>
  )
}
