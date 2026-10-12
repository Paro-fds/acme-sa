import { Link, useLocation, useNavigate } from 'react-router'
import { loginMfa } from '../../../api/mfa.js'
import Alert from '../../../components/Alert.jsx'
import { useLoader } from '../../../lib/useLoader.js'
import { enterRhSpace } from '../AdminLoginPage.jsx'
import GestionLoginLayout, { LoginNote } from '../GestionLoginLayout.jsx'
import MfaStep, { mfaStepTitle } from './MfaStep.jsx'

const LOGIN_PATH = '/admin/connexion'

/**
 * US-102, US-107, US-111 : étape 2 seule, quand un écran de gestion est ouvert avant le code (ou la page rechargée).
 * Le mot de passe est déjà vérifié ; l'état de la double authentification est demandé au serveur,
 * sauf s'il arrive par `location.state.step`.
 */
export default function MfaLoginPage() {
  const navigate = useNavigate()
  const step = useLocation().state?.step
  const { data: status, error, loading } = useLoader(() => (step ? Promise.resolve(step.mfa) : loginMfa.status()), {
    loginPath: LOGIN_PATH,
  })

  return (
    <GestionLoginLayout step={2} {...(status ? mfaStepTitle(status) : { title: 'Vérification' })}>
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {status && <MfaStep status={status} sent={step?.code} onDone={() => enterRhSpace(navigate)} />}
      <LoginNote>
        <p className="flex flex-wrap items-center justify-between gap-2">
          <span>Mot de passe vérifié.</span>
          <Link to={LOGIN_PATH} className="flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Recommencer
          </Link>
        </p>
      </LoginNote>
    </GestionLoginLayout>
  )
}
