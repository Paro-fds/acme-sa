import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { login } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import { formatMinutesSeconds, useCountdown } from '../../lib/useCountdown.js'
import { HOME_PATH } from '../../lib/paths.js'
import IdentityFields, { EMPTY_IDENTITY, isIdentityComplete } from './IdentityFields.jsx'

const FORGOTTEN_PASSWORD_HELP =
  "Contactez l'administration : elle réinitialisera votre accès et vous pourrez créer un nouveau mot de passe."
const HR_HELP = 'Une question ? Adressez-vous au service RH de votre agence.'
const DEFAULT_LOCK_SECONDS = 15 * 60

/**
 * US-101 : connexion en un seul écran (nom, prénom, date de naissance, mot de passe).
 * Un seul message quand la connexion échoue (CA-03) ; compte à rebours pendant la suspension (CA-06).
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message ? { message: location.state.message } : null)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [lockDeadline, setLockDeadline] = useState(null)
  const [sending, setSending] = useState(false)
  const [showForgottenHelp, setShowForgottenHelp] = useState(false)

  const lockSeconds = useCountdown(lockDeadline)
  const locked = lockSeconds > 0
  const complete = isIdentityComplete(identity) && password

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending || locked) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      await login(identity, password)
      navigate('/profil', { replace: true })
    } catch (apiError) {
      setSending(false)
      if (apiError.code === 'IDENTITY_AMBIGUOUS') {
        navigate('/connexion/homonyme')
        return
      }
      setPassword('')
      if (apiError.code === 'ACCOUNT_LOCKED') {
        const seconds = apiError.details?.retry_after ?? DEFAULT_LOCK_SECONDS
        setLockDeadline(Date.now() + seconds * 1000)
        return
      }
      setError({
        title: apiError.code === 'INVALID_CREDENTIALS' ? 'Vérification demandée' : undefined,
        message: apiError.message,
      })
    }
  }

  return (
    <Page title="Connexion" backTo={HOME_PATH}>
      <Mascot role="Conseillère RH">« Retrouvez votre espace professionnel sécurisé. »</Mascot>

      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Bienvenue</h2>
        <p>Connectez-vous à votre dossier RH ACME SA avec vos identifiants d'employé.</p>
      </div>

      <Alert tone="info">{notice}</Alert>
      {locked ? (
        <Alert title="Espace temporairement suspendu">
          Trop d'essais. Pour votre sécurité, réessayez dans quelques minutes.
          <br />
          {HR_HELP}
        </Alert>
      ) : (
        <Alert title={error?.title}>{error?.message}</Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <IdentityFields identity={identity} onChange={setIdentity} />
        <PasswordField
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={!complete || sending || locked}>
          <span className="material-symbols-outlined" aria-hidden="true">{locked ? 'lock_clock' : 'login'}</span>
          {locked ? `Suspendu temporairement (${formatMinutesSeconds(lockSeconds)})` : 'Me connecter'}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3">
        <Link
          to="/connexion/premiere"
          className="flex min-h-11 items-center gap-2 px-2 font-semibold text-primary underline-offset-4 hover:underline"
        >
          <span className="material-symbols-outlined" aria-hidden="true">key</span>
          Première connexion ? Créer mon mot de passe
        </Link>
        <button
          type="button"
          onClick={() => setShowForgottenHelp(!showForgottenHelp)}
          aria-expanded={showForgottenHelp}
          className="min-h-11 px-2 font-semibold text-primary underline-offset-4 hover:underline"
        >
          Mot de passe oublié ?
        </button>
        {showForgottenHelp && <Alert tone="info">{FORGOTTEN_PASSWORD_HELP}</Alert>}
      </div>
    </Page>
  )
}
