import { useId, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { identify, sendLoginCode, verifyLoginCode } from '../../api/auth.js'
import team from '../../assets/equipe-acme.jpg'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import PublicHeader from '../../components/PublicHeader.jsx'
import TextField from '../../components/TextField.jsx'
import { HOME_PATH } from '../../lib/paths.js'
import { formatMinutesSeconds, useCountdown } from '../../lib/useCountdown.js'
import CodeBoxes from '../admin/mfa/CodeBoxes.jsx'
import BirthDateField, { BIRTH_DATE_LENGTH } from './BirthDateField.jsx'

const NO_CHANNEL = "Aucun courriel ni numéro WhatsApp n'est enregistré à votre dossier. Contactez la DRH."
const CHANNELS = {
  EMAIL: { label: 'Courriel', action: 'Recevoir mon code par courriel', missing: "Aucun courriel n'est enregistré à votre dossier." },
  WHATSAPP: {
    label: 'WhatsApp',
    action: 'Recevoir mon code par WhatsApp',
    missing: "Aucun numéro WhatsApp n'est enregistré à votre dossier.",
  },
}

/** US-1004, US-1005, US-1018 : pourquoi un canal est grisé. */
function unavailableReason(option) {
  if (option.unavailable) return 'Indisponible'
  if (!option.destination) return CHANNELS[option.channel].missing
  if (option.recently_changed) return 'Ce contact a été modifié il y a moins de 72 heures. Contactez la DRH.'
  return 'Vous avez reçu 5 codes par WhatsApp ce mois-ci.'
}

const secondsFromNow = (seconds) => Date.now() + seconds * 1000

/**
 * US-1003 (doc PAM) : connexion en trois étapes sur la même page.
 * 1. Code employé et date de naissance ; un seul message d'échec (« Informations incorrectes. »).
 * 2. Le courriel et le numéro WhatsApp de Vault, masqués (US-1004 : messages WhatsApp restants) ; l'employé ne peut saisir
 *    aucune autre adresse ; un canal absent est grisé ; sans aucun des deux, « Contactez la DRH ».
 * 3. Le code à 6 chiffres, avec sa durée de validité et « Renvoyer le code » après 60 secondes.
 * US-1015 : à partir de 3 échecs, un calcul est demandé ; un verrou répond comme une erreur (modèle du directeur).
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const titleId = useId()
  const codeId = useId()
  const [step, setStep] = useState('identity')
  const [employeeCode, setEmployeeCode] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [channels, setChannels] = useState([])
  const [chosen, setChosen] = useState(null)
  const [sent, setSent] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(location.state?.message ? { message: location.state.message } : null)
  // US-04, US-125 : « Vous êtes déconnecté », déconnexion après inactivité.
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [resendAt, setResendAt] = useState(null)
  const [sending, setSending] = useState(false)

  const validSeconds = useCountdown(expiresAt)
  const resendSeconds = useCountdown(resendAt)

  function fail(apiError) {
    setSending(false)
    if (apiError.code === 'CODE_RESEND_TOO_SOON' || apiError.code === 'TOO_MANY_CODES') {
      setResendAt(secondsFromNow(apiError.details?.retry_after ?? 60))
    }
    if (apiError.code === 'NOT_AUTHENTICATED' || apiError.code === 'SESSION_EXPIRED') {
      setStep('identity')
      setError({ message: 'Votre identification a expiré. Recommencez.' })
      return
    }
    setError({ message: apiError.message })
  }

  const identityReady =
    employeeCode.trim() && birthDate.length === BIRTH_DATE_LENGTH && (!captcha || captchaAnswer.trim())

  async function handleIdentify(event) {
    event.preventDefault()
    if (!identityReady || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const identified = await identify(employeeCode, birthDate, captcha ? captchaAnswer : undefined)
      setCaptcha(null)
      setChannels(identified.channels)
      setStep('channel')
      setSending(false)
    } catch (apiError) {
      setCaptcha(apiError.details?.captcha ?? null)
      setCaptchaAnswer('')
      fail(apiError)
    }
  }

  async function handleSend(name = chosen) {
    if (sending) return
    setSending(true)
    setChosen(name)
    setError(null)
    try {
      const result = await sendLoginCode(name)
      setSent(result)
      setCode('')
      setExpiresAt(secondsFromNow(result.expires_in))
      setResendAt(secondsFromNow(result.resend_in))
      setStep('code')
      setSending(false)
    } catch (apiError) {
      fail(apiError)
    }
  }

  async function handleVerify(event) {
    event.preventDefault()
    if (code.length !== 6 || sending) return
    setSending(true)
    setError(null)
    try {
      await verifyLoginCode(code)
      navigate('/accueil', { replace: true })
    } catch (apiError) {
      setCode('')
      fail(apiError)
    }
  }

  function restart() {
    setStep('identity')
    setError(null)
    setCode('')
    setSent(null)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <PublicHeader
        action={
          <Link
            to={HOME_PATH}
            aria-label="Retour à l'accueil"
            className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 font-semibold whitespace-nowrap text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">arrow_back</span>
            <span className="sm:hidden">Accueil</span>
            <span className="hidden sm:inline">Retour à l'accueil</span>
          </Link>
        }
      />

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-10">
        <aside className="flex flex-col gap-4">
          <img
            src={team}
            alt="Une équipe d'ACME SA en polo jaune, devant une agence"
            width="1024"
            height="683"
            fetchPriority="high"
            className="h-36 w-full rounded-2xl object-cover object-[center_30%] sm:h-56 lg:h-[400px]"
          />
          <p className="hidden text-lg leading-relaxed text-help lg:block">
            Mettez votre dossier à jour et déposez vos diplômes : ils comptent pour les promotions et les postes ouverts.
          </p>
        </aside>

        <div className="flex flex-col gap-6">
          <h1 id={titleId} className="text-[28px] leading-[35px] font-bold text-primary lg:text-[34px] lg:leading-[42px]">
            Connexion
          </h1>
          <p className="text-sm font-semibold text-help">
            Étape {step === 'identity' ? 1 : step === 'channel' ? 2 : 3} sur 3
          </p>

          {step === 'identity' && (
            <form aria-labelledby={titleId} onSubmit={handleIdentify} className="flex flex-col gap-5" noValidate>
              <Alert tone="info">{notice}</Alert>
              <Alert>{error?.message}</Alert>
              <TextField
                label="Code employé"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
              />
              <BirthDateField value={birthDate} onChange={setBirthDate} />
              {captcha && (
                <TextField
                  label={captcha}
                  help="Après plusieurs essais, répondez à ce calcul pour continuer."
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value.replace(/\D/g, ''))}
                />
              )}
              <Button type="submit" disabled={!identityReady || sending}>
                Continuer
              </Button>
            </form>
          )}

          {step === 'channel' && (
            <section aria-labelledby={titleId} className="flex flex-col gap-5">
              <Alert>{error?.message}</Alert>
              {channels.some((option) => option.available) ? (
                <>
                  <p className="text-base text-heading">Où voulez-vous recevoir votre code à 6 chiffres ?</p>
                  <ul aria-label="Canaux de réception" className="flex flex-col gap-3">
                    {channels.map((option) => (
                      <li
                        key={option.channel}
                        className={`flex flex-col gap-2 rounded-xl border p-4 ${option.available ? 'border-border bg-surface' : 'border-border bg-canvas'}`}
                      >
                        <p className={option.available ? 'text-heading' : 'text-muted'}>
                          <span className="font-semibold">{CHANNELS[option.channel].label}</span>
                          {option.destination && ` : ${option.destination}`}
                        </p>
                        {option.channel === 'WHATSAPP' && option.destination && !option.unavailable && (
                          <p className="text-sm text-help">
                            {option.remaining} message{option.remaining > 1 ? 's' : ''} restant{option.remaining > 1 ? 's' : ''} ce
                            mois-ci (sur 5)
                          </p>
                        )}
                        {option.available ? (
                          <Button onClick={() => handleSend(option.channel)} disabled={sending}>
                            {CHANNELS[option.channel].action}
                          </Button>
                        ) : (
                          <p className="text-sm text-muted">{unavailableReason(option)}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Alert title="Contactez la DRH">{NO_CHANNEL}</Alert>
              )}
              <Button variant="ghost" onClick={restart}>
                Modifier mes informations
              </Button>
            </section>
          )}

          {step === 'code' && (
            <form aria-labelledby={titleId} onSubmit={handleVerify} className="flex flex-col gap-5" noValidate>
              <p className="text-base text-heading">
                Saisissez le code envoyé à <span className="font-semibold">{sent?.destination}</span>.
              </p>
              {sent?.local_code && <Alert tone="info">Poste local : aucun message ne part. Code : {sent.local_code}</Alert>}
              {sent?.remaining != null && (
                <p className="text-sm text-help">
                  WhatsApp : {sent.remaining} message{sent.remaining > 1 ? 's' : ''} restant{sent.remaining > 1 ? 's' : ''} ce
                  mois-ci (sur 5)
                </p>
              )}
              {error && (
                <Alert>{error.message}</Alert>
              )}
              <div className="flex flex-col gap-2">
                <label htmlFor={codeId} className="text-base font-semibold text-heading">
                  Code reçu
                </label>
                <CodeBoxes id={codeId} value={code} onChange={setCode} invalid={Boolean(error)} />
                <p className="text-sm text-help" aria-live="polite">
                  {validSeconds > 0 ? `Valable encore ${formatMinutesSeconds(validSeconds)}` : 'Ce code a expiré : demandez-en un nouveau.'}
                </p>
              </div>
              <Button type="submit" disabled={code.length !== 6 || sending}>
                Me connecter
              </Button>
              <Button variant="secondary" onClick={() => handleSend()} disabled={resendSeconds > 0 || sending}>
                {resendSeconds > 0 ? `Renvoyer le code (${formatMinutesSeconds(resendSeconds)})` : 'Renvoyer le code'}
              </Button>
              <Button variant="ghost" onClick={restart}>
                Modifier mes informations
              </Button>
            </form>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-4 text-[15px] leading-snug">
            <p className="font-semibold text-heading">Vous ne recevez pas le code ?</p>
            <p className="text-help">
              Regardez dans vos courriels indésirables. Votre courriel ou votre accès pose problème ? Adressez-vous à la
              DRH : vous ne pouvez pas changer votre courriel ici.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
