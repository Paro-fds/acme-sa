import { useId, useState } from 'react'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import TextField from '../../../components/TextField.jsx'
import CodeForm from './CodeForm.jsx'
import { METHOD_ORDER, METHODS, codeInstruction } from './methods.js'

/** Méthode fermée sur cet environnement : le service d'envoi des codes n'est pas encore choisi (D-41). */
const UNAVAILABLE_HELP = "Pas encore disponible : le service d'envoi des codes reste à choisir."

function MethodOption({ method, checked, onChange, name, available }) {
  const { title, icon } = METHODS[method]
  const help = available ? METHODS[method].help : UNAVAILABLE_HELP
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border-[1.5px] bg-surface p-4 ${
        checked ? 'border-primary shadow-[0_0_0_3px_rgb(30_30_130/0.12)]' : 'border-border'
      } ${available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
    >
      <input
        type="radio"
        name={name}
        value={method}
        checked={checked}
        onChange={onChange}
        disabled={!available}
        className="mt-3 size-5 shrink-0 accent-primary"
      />
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-heading">{title}</span>
        <span className="text-sm text-help">{help}</span>
      </span>
    </label>
  )
}

/** CA-03 : QR code à scanner une fois, et la clé à saisir à la main si l'appareil photo ne fonctionne pas. */
function TotpInstructions({ totp }) {
  const spacedSecret = totp.secret.match(/.{1,4}/g).join(' ')
  return (
    <ol className="flex list-decimal flex-col gap-3 pl-5">
      <li>Ouvrez Microsoft Authenticator (ou votre application) et choisissez « Ajouter un compte ».</li>
      <li className="flex flex-col gap-3">
        Scannez ce QR code{' '}:
        <img
          src={totp.qr_code}
          alt="QR code à scanner avec l'application d'authentification"
          className="size-52 self-center rounded-lg border border-border bg-white p-1"
        />
        <span className="text-sm text-help">
          Impossible de scanner{' '}? Saisissez cette clé{' '}:{' '}
          <code className="font-mono font-semibold break-all text-heading">{spacedSecret}</code>
        </span>
      </li>
      <li>Saisissez ci-dessous le code à 6 chiffres que l'application affiche.</li>
    </ol>
  )
}

/**
 * US-102 CA-01 : choisir sa méthode, puis la confirmer avec un premier code.
 * `api` : { start(method, destination), confirm(code) } (connexion, ou changement depuis son compte).
 * `available` : méthodes ouvertes sur cet environnement (`available_methods` de l'API) ; les autres sont grisées.
 */
export default function MethodSetup({
  api,
  onDone,
  available = METHOD_ORDER,
  submitLabel = 'Activer la double authentification',
}) {
  const name = useId()
  const [method, setMethod] = useState(null)
  const [destination, setDestination] = useState('')
  const [destinationError, setDestinationError] = useState(null)
  const [failure, setFailure] = useState(null)
  const [sending, setSending] = useState(false)
  const [started, setStarted] = useState(null)
  const needsDestination = method !== null && method !== 'TOTP'
  const complete = method !== null && (!needsDestination || destination.trim() !== '')

  async function handleStart(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setDestinationError(null)
    setFailure(null)
    try {
      setStarted(await api.start(method, needsDestination ? destination.trim() : null))
    } catch (apiError) {
      if (apiError.field === 'destination') setDestinationError(apiError.message)
      else setFailure(apiError.message)
    }
    setSending(false)
  }

  async function handleConfirm(code) {
    await api.confirm(code)
    await onDone()
  }

  async function handleResend() {
    const again = await api.start(started.method, destination.trim())
    return again.code
  }

  if (started) {
    const sent = started.code
    return (
      <div className="flex flex-col gap-5">
        <h3 className="text-xl font-bold">
          {started.method === 'TOTP' ? 'Associer votre application' : 'Confirmer avec le code reçu'}
        </h3>
        <CodeForm
          instruction={codeInstruction(started.method, sent?.destination)}
          sent={sent}
          onSubmit={handleConfirm}
          onResend={sent ? handleResend : undefined}
          submitLabel={submitLabel}
        >
          {started.totp && <TotpInstructions totp={started.totp} />}
        </CodeForm>
        <Button variant="subtle" onClick={() => setStarted(null)}>
          Choisir une autre méthode
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleStart} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold text-heading">
          Comment souhaitez-vous recevoir vos codes{' '}?
        </legend>
        {METHOD_ORDER.map((option) => (
          <MethodOption
            key={option}
            method={option}
            name={name}
            checked={method === option}
            available={available.includes(option)}
            onChange={() => {
              setMethod(option)
              setDestination('')
              setDestinationError(null)
            }}
          />
        ))}
      </fieldset>
      {needsDestination && (
        <TextField
          label={METHODS[method].destinationLabel}
          help={METHODS[method].destinationHelp}
          type={METHODS[method].inputType}
          autoComplete={METHODS[method].autoComplete}
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value)
            setDestinationError(null)
          }}
          error={destinationError}
        />
      )}
      <Alert>{failure}</Alert>
      <Button type="submit" disabled={!complete || sending}>
        {sending ? 'Envoi…' : method === 'TOTP' ? 'Afficher le QR code' : 'Recevoir un code'}
      </Button>
    </form>
  )
}
