import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { register } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import { EMPLOYEE_LOGIN_PATH } from '../../lib/paths.js'
import IdentityFields, { EMPTY_IDENTITY, isIdentityComplete } from './IdentityFields.jsx'

const PASSWORD_FIELDS = ['password', 'password_confirmation']

/**
 * US-101 (décision 4) : création du mot de passe à la première connexion, sur le modèle de l'écran de connexion.
 * Un refus a le même message, que la personne existe ou non (CA-03).
 */
export default function CreatePasswordPage() {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const complete = isIdentityComplete(identity) && password && confirmation

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    try {
      await register(identity, password, confirmation)
      navigate('/accueil', { replace: true })
    } catch (apiError) {
      setSending(false)
      if (apiError.code === 'IDENTITY_AMBIGUOUS') {
        navigate('/connexion/homonyme')
        return
      }
      setError(apiError)
    }
  }

  const fieldError = (field) => (error?.field === field ? error.message : null)
  const generalError = error && !PASSWORD_FIELDS.includes(error.field) ? error.message : null

  return (
    <Page title="Connexion" backTo={EMPLOYEE_LOGIN_PATH}>
      <Mascot role="Conseillère RH">« Bienvenue ! Choisissez un mot de passe pour sécuriser votre dossier. »</Mascot>

      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Première connexion</h2>
        <p>Saisissez vos informations telles qu'elles figurent dans votre dossier RH, puis choisissez votre mot de passe.</p>
      </div>

      <Alert>{generalError}</Alert>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <IdentityFields identity={identity} onChange={setIdentity} />
        <PasswordField
          label="Mot de passe"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          help="Au moins 8 caractères."
          error={fieldError('password')}
        />
        <PasswordField
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={fieldError('password_confirmation')}
        />
        <Button type="submit" disabled={!complete || sending}>
          Créer mon mot de passe
        </Button>
      </form>

      <Link
        to={EMPLOYEE_LOGIN_PATH}
        className="flex min-h-11 items-center self-center px-2 font-semibold text-primary underline-offset-4 hover:underline"
      >
        Vous avez déjà un mot de passe ? Se connecter
      </Link>
    </Page>
  )
}
