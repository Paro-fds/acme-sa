import { loginMfa } from '../../../api/mfa.js'
import CodeForm from './CodeForm.jsx'
import MethodSetup from './MethodSetup.jsx'
import { METHODS, codeInstruction } from './methods.js'

/**
 * US-102, US-107 : étape 2 de la connexion RH. Première fois (ou après réinitialisation) : choix de la méthode ;
 * ensuite : le code de la méthode enregistrée. `sent` : code envoyé à la connexion (WhatsApp, email).
 */
export default function MfaStep({ status, sent, onDone }) {
  if (!status.enrolled) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-heading">Protégez votre compte</h3>
          <p>
            L'espace RH donne accès aux dossiers de tous les employés. À chaque connexion, en plus de votre mot de
            passe, un code à 6 chiffres vous sera demandé.
          </p>
        </div>
        <MethodSetup api={loginMfa} onDone={onDone} available={status.available_methods} />
      </div>
    )
  }

  const sendsCode = status.method !== 'TOTP'
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 text-sm text-help">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{METHODS[status.method].icon}</span>
        {METHODS[status.method].title}
        {status.destination ? ` · ${status.destination}` : ''}
      </p>
      <CodeForm
        instruction={codeInstruction(status.method, status.destination)}
        sent={sent}
        onSubmit={async (code) => {
          await loginMfa.verify(code)
          await onDone()
        }}
        onResend={sendsCode ? loginMfa.resend : undefined}
        submitLabel="Valider"
      />
      <p className="text-sm text-help">
        Téléphone perdu ou changé{' '}? Demandez à un autre compte RH de réinitialiser votre double
        authentification.
      </p>
    </div>
  )
}
