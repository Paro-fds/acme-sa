import { Link, useLocation, useNavigate } from 'react-router'
import { loginMfa } from '../../../api/mfa.js'
import Alert from '../../../components/Alert.jsx'
import { useLoader } from '../../../lib/useLoader.js'
import { enterRhSpace } from '../AdminLoginPage.jsx'
import RhLoginCard, { LoginStep, StepDivider } from '../RhLoginCard.jsx'
import MfaStep from './MfaStep.jsx'

const LOGIN_PATH = '/admin/connexion'

/**
 * US-102, US-107 : étape 2 seule, quand un écran RH est ouvert avant le code (ou la page rechargée).
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
    <RhLoginCard>
      <LoginStep number={1} title="Identifiants" state="done">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-4 py-3">
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-status-done-text" aria-hidden="true">check_circle</span>
            Mot de passe vérifié
          </p>
          <Link to={LOGIN_PATH} className="flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            Recommencer
          </Link>
        </div>
      </LoginStep>

      <StepDivider />

      <LoginStep number={2} title="Vérification de sécurité" state="active">
        {loading && <p role="status">Chargement…</p>}
        {error && <Alert>{error.message}</Alert>}
        {status && <MfaStep status={status} sent={step?.code} onDone={() => enterRhSpace(navigate)} />}
      </LoginStep>
    </RhLoginCard>
  )
}
