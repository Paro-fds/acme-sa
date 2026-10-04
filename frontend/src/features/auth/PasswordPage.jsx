import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { login, register } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'

/** US-02 (création) et US-03 (saisie) du mot de passe, après l'identification. */
export default function PasswordPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  if (!state?.identity) return <Navigate to="/" replace />
  const creating = state.mode === 'create'
  const complete = password && (!creating || confirmation)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    try {
      if (creating) await register(state.identity, password, confirmation)
      else await login(state.identity, password)
      navigate('/profil', { replace: true })
    } catch (apiError) {
      setError(apiError)
      setSending(false)
    }
  }

  const fieldError = (field) => (error?.field === field ? error.message : null)
  const generalError = error && !['password', 'password_confirmation'].includes(error.field) ? error.message : null

  return (
    <Page title="Identification" backTo="/">
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">
          {creating ? 'Créez votre mot de passe' : 'Saisissez votre mot de passe'}
        </h2>
        <p>
          {creating
            ? 'Première connexion : choisissez un mot de passe pour sécuriser votre dossier.'
            : `Bonjour ${state.identity.first_name}, saisissez votre mot de passe.`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete={creating ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          help={creating ? '8 caractères minimum.' : undefined}
          error={fieldError('password')}
        />
        {creating && (
          <TextField
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            error={fieldError('password_confirmation')}
          />
        )}
        <Alert>{generalError}</Alert>
        <Button type="submit" disabled={!complete || sending}>
          {creating ? 'Créer mon mot de passe' : 'Se connecter'}
        </Button>
      </form>
    </Page>
  )
}
