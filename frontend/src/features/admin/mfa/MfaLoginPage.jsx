import { useLocation, useNavigate } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { loginMfa } from '../../../api/mfa.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { ADMIN_PASSWORD_PATH, useLoader } from '../../../lib/useLoader.js'
import CodeForm from './CodeForm.jsx'
import MethodSetup from './MethodSetup.jsx'
import { METHODS, codeInstruction } from './methods.js'

const LOGIN_PATH = '/admin/connexion'

/**
 * US-102 : deuxième étape de la connexion RH. Première fois (ou après réinitialisation) : choix de la méthode ;
 * ensuite : le code de la méthode enregistrée. Le code envoyé à la connexion arrive par `location.state.step`.
 */
export default function MfaLoginPage() {
  const navigate = useNavigate()
  const step = useLocation().state?.step
  const { data: status, error, loading } = useLoader(() => (step ? Promise.resolve(step.mfa) : loginMfa.status()), {
    loginPath: LOGIN_PATH,
  })

  async function enter() {
    const me = await getAdminMe()
    navigate(me.must_change_password ? ADMIN_PASSWORD_PATH : '/admin', { replace: true })
  }

  const page = (children) => (
    <Page title="Administration" backTo={LOGIN_PATH}>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  if (!status.enrolled) {
    return page(
      <>
        <div className="flex flex-col gap-2">
          <h2 className="text-[26px] leading-8 font-bold">Protégez votre compte</h2>
          <p>
            L'espace RH donne accès aux dossiers de tous les employés. À chaque connexion, en plus de votre mot de
            passe, un code à 6 chiffres vous sera demandé.
          </p>
        </div>
        <MethodSetup api={loginMfa} onDone={enter} available={status.available_methods} />
      </>,
    )
  }

  const sendsCode = status.method !== 'TOTP'
  return page(
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Double authentification</h2>
        <p className="flex items-center gap-2 text-help">
          <span className="material-symbols-outlined" aria-hidden="true">{METHODS[status.method].icon}</span>
          {METHODS[status.method].title}
          {status.destination ? ` · ${status.destination}` : ''}
        </p>
      </div>
      <CodeForm
        instruction={codeInstruction(status.method, status.destination)}
        sent={step?.code}
        onSubmit={async (code) => {
          await loginMfa.verify(code)
          await enter()
        }}
        onResend={sendsCode ? loginMfa.resend : undefined}
        submitLabel="Me connecter"
      />
      <p className="text-sm text-help">
        Téléphone perdu ou changé{' '}? Demandez à un autre compte RH de réinitialiser votre double
        authentification.
      </p>
    </>,
  )
}
