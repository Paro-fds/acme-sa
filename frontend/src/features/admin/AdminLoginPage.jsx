import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getAdminMe } from '../../api/admin.js'
import { adminLogin } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import TextField from '../../components/TextField.jsx'
import { ADMIN_PASSWORD_PATH } from '../../lib/useLoader.js'
import MfaStep from './mfa/MfaStep.jsx'
import RhLoginCard, { LoginStep, StepDivider } from './RhLoginCard.jsx'

/** Après la double authentification : le tableau de bord, ou le choix du mot de passe s'il est provisoire (US-23). */
export async function enterRhSpace(navigate) {
  const me = await getAdminMe()
  navigate(me.must_change_password ? ADMIN_PASSWORD_PATH : '/admin', { replace: true })
}

/** Étape 2 en attente : rien à saisir tant que le mot de passe n'est pas vérifié. */
export function WaitingMfaStep() {
  return <p className="text-help">Après vos identifiants, un code à 6 chiffres vous sera demandé.</p>
}

/**
 * US-15, US-107 (écran validé A01) : connexion RH en deux étapes sur la même carte.
 * 1 Identifiants ; 2 Vérification de sécurité (US-102), qui s'ouvre sans changer d'écran.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message ?? null)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [forgotten, setForgotten] = useState(false)
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
        // US-102 : mot de passe vérifié, le second facteur est attendu sur la même carte.
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

  return (
    <RhLoginCard>
      <LoginStep number={1} title="Identifiants" state={step ? 'done' : 'active'}>
        {step ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-4 py-3">
            <p className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined text-status-done-text" aria-hidden="true">check_circle</span>
              <span className="break-all font-semibold text-heading">{username.trim()}</span>
            </p>
            <button
              type="button"
              onClick={() => setStep(null)}
              className="min-h-11 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Changer d'identifiant
            </button>
          </div>
        ) : (
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
              labelAside={
                <button
                  type="button"
                  onClick={() => setForgotten(true)}
                  aria-expanded={forgotten}
                  className="min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              }
            />
            {forgotten && <Alert tone="info">Demandez à un Administrateur de réinitialiser votre accès.</Alert>}
            <Alert>{error}</Alert>
            <Button type="submit" variant={complete ? 'primary' : 'subtle'} disabled={!complete || sending}>
              {sending ? 'Vérification…' : 'Continuer'}
            </Button>
          </form>
        )}
      </LoginStep>

      <StepDivider />

      <LoginStep number={2} title="Vérification de sécurité" state={step ? 'active' : 'waiting'}>
        {step ? <MfaStep status={step.mfa} sent={step.code} onDone={() => enterRhSpace(navigate)} /> : <WaitingMfaStep />}
      </LoginStep>
    </RhLoginCard>
  )
}
