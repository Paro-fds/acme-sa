import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { login, register } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'

const FORGOTTEN_PASSWORD_HELP =
  "Contactez l'administration : elle réinitialisera votre accès et vous pourrez créer un nouveau mot de passe."

/** US-02 (création) et US-03 (saisie) du mot de passe, après l'identification. */
export default function PasswordPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [showForgottenHelp, setShowForgottenHelp] = useState(false)

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
      setSending(false)
      if (apiError.code === 'PASSWORD_NOT_SET') {
        // Accès réinitialisé entre-temps : l'employé doit créer un nouveau mot de passe.
        setPassword('')
        navigate('.', { replace: true, state: { ...state, mode: 'create' } })
        return
      }
      setError(apiError)
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
        <PasswordField
          label="Mot de passe"
          autoComplete={creating ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          help={creating ? 'Au moins 8 caractères.' : undefined}
          error={fieldError('password')}
        />
        {creating && (
          <PasswordField
            label="Confirmer le mot de passe"
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
        {!creating && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowForgottenHelp(!showForgottenHelp)}
              aria-expanded={showForgottenHelp}
              className="min-h-11 self-center px-2 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </button>
            {showForgottenHelp && <Alert tone="info">{FORGOTTEN_PASSWORD_HELP}</Alert>}
          </div>
        )}
      </form>
    </Page>
  )
}
