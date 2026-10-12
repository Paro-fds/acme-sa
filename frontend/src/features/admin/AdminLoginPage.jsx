import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getAdminMe } from '../../api/admin.js'
import { adminLogin } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import TextField from '../../components/TextField.jsx'
import { ADMIN_PASSWORD_PATH } from '../../lib/useLoader.js'
import GestionLoginLayout, { LoginNote } from './GestionLoginLayout.jsx'
import MfaStep, { mfaStepTitle } from './mfa/MfaStep.jsx'

/** Après la double authentification : le tableau de bord, ou le choix du mot de passe s'il est provisoire (US-23). */
export async function enterRhSpace(navigate) {
  const me = await getAdminMe()
  navigate(me.must_change_password ? ADMIN_PASSWORD_PATH : '/admin', { replace: true })
}

/**
 * US-15, US-107 ; US-111 : connexion à l'espace de gestion en deux étapes, chacune sur son écran épuré.
 * 1 Connexion (identifiant, mot de passe) ; 2 Vérification (US-102), sans changer d'adresse.
 * Un message reçu en arrivant (« Vous devez être connecté », session expirée) est une information, pas une erreur.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(location.state?.notice ?? location.state?.message ?? null)
  const [sending, setSending] = useState(false)
  const [step, setStep] = useState(null)
  const complete = username.trim() !== '' && password !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const next = await adminLogin(username.trim(), password)
      if (next) {
        // US-102 : mot de passe vérifié, le second facteur est attendu sans changer d'adresse.
        setPassword('')
        setStep(next)
        setSending(false)
        return
      }
      await enterRhSpace(navigate)
    } catch (apiError) {
      setError(apiError.message)
      setPassword('')
      setSending(false)
    }
  }

  if (step) {
    return (
      <GestionLoginLayout step={2} {...mfaStepTitle(step.mfa)}>
        <MfaStep status={step.mfa} sent={step.code} onDone={() => enterRhSpace(navigate)} />
        <LoginNote>
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Identifiant : <strong className="break-all text-heading">{username.trim()}</strong>
            </span>
            <button
              type="button"
              onClick={() => setStep(null)}
              className="min-h-11 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Changer d'identifiant
            </button>
          </p>
        </LoginNote>
      </GestionLoginLayout>
    )
  }

  return (
    <GestionLoginLayout step={1} title="Connexion" intro="Saisissez l'identifiant et le mot de passe de votre compte.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Alert tone="info">{notice}</Alert>
        <TextField
          label="Identifiant"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={!complete || sending}>
          {sending ? 'Vérification…' : 'Continuer'}
        </Button>
      </form>
      <LoginNote>
        <p>
          <strong className="text-heading">Mot de passe oublié ?</strong> Demandez à un Administrateur de réinitialiser
          votre accès.
        </p>
        <p>Ensuite, un code à 6 chiffres vous sera demandé pour confirmer que c'est bien vous.</p>
      </LoginNote>
    </GestionLoginLayout>
  )
}
