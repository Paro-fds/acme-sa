import { useState } from 'react'
import { myMfa } from '../../../api/mfa.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'
import { useLoader } from '../../../lib/useLoader.js'
import Block from '../Block.jsx'
import CodeForm from './CodeForm.jsx'
import MethodSetup from './MethodSetup.jsx'
import { METHODS, codeInstruction } from './methods.js'

const LOGIN_PATH = '/admin/connexion'

/** CA-04 : confirmer d'abord avec la méthode actuelle (code envoyé, ou lu dans l'application). */
function ConfirmCurrent({ status, onConfirmed, onCancel }) {
  const sendsCode = status.method !== 'TOTP'
  const [sent, setSent] = useState(null)
  const [failure, setFailure] = useState(null)

  async function send() {
    setFailure(null)
    try {
      setSent(await myMfa.sendCode())
    } catch (apiError) {
      setFailure(apiError.message)
    }
  }

  if (sendsCode && !sent) {
    return (
      <div className="flex flex-col gap-3">
        <p>Pour changer de méthode, confirmez d'abord avec votre méthode actuelle.</p>
        <Alert>{failure}</Alert>
        <Button onClick={send}>Recevoir un code {METHODS[status.method].channel}</Button>
        <Button variant="subtle" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p>Pour changer de méthode, confirmez d'abord avec votre méthode actuelle.</p>
      <CodeForm
        instruction={codeInstruction(status.method, status.destination)}
        sent={sent}
        onSubmit={async (code) => {
          await myMfa.confirmCurrent(code)
          onConfirmed()
        }}
        onResend={sendsCode ? myMfa.sendCode : undefined}
        submitLabel="Confirmer"
      />
      <Button variant="subtle" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  )
}

/** US-102 CA-04 : « Ma double authentification » (depuis le menu du compte RH). */
export default function MySecurityPage() {
  const { data: status, error, loading, reload } = useLoader(myMfa.status, { loginPath: LOGIN_PATH })
  const [phase, setPhase] = useState('view')
  const [notice, setNotice] = useState(null)

  const page = (children) => (
    <Page account="admin" title="Ma double authentification" backTo="/admin">
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  const current = METHODS[status.method]
  return page(
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Ma double authentification</h2>
        <p>Le code demandé à chaque connexion, en plus de votre mot de passe.</p>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}

      <Block icon="verified_user" title="Méthode actuelle">
        <p className="flex items-center gap-2 font-semibold text-heading">
          <span className="material-symbols-outlined" aria-hidden="true">{current.icon}</span>
          {current.title}
          {status.destination ? ` · ${status.destination}` : ''}
        </p>
      </Block>

      {phase === 'view' && (
        <Button
          variant="secondary"
          onClick={() => {
            setNotice(null)
            setPhase('confirm')
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">swap_horiz</span>
          Changer de méthode
        </Button>
      )}
      {phase === 'confirm' && (
        <ConfirmCurrent status={status} onConfirmed={() => setPhase('setup')} onCancel={() => setPhase('view')} />
      )}
      {phase === 'setup' && (
        <MethodSetup
          api={myMfa}
          submitLabel="Enregistrer la nouvelle méthode"
          onDone={() => {
            setPhase('view')
            setNotice('Nouvelle méthode enregistrée. Elle sera demandée à votre prochaine connexion.')
            reload()
          }}
        />
      )}
    </>,
  )
}
