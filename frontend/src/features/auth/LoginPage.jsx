import { useId, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { login } from '../../api/auth.js'
import team from '../../assets/equipe-acme.jpg'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import PublicHeader from '../../components/PublicHeader.jsx'
import { formatMinutesSeconds, useCountdown } from '../../lib/useCountdown.js'
import { HOME_PATH } from '../../lib/paths.js'
import IdentityFields, { EMPTY_IDENTITY, isIdentityComplete } from './IdentityFields.jsx'

const HR_HELP = 'Une question ? Adressez-vous au service RH de votre agence.'
const DEFAULT_LOCK_SECONDS = 15 * 60

/**
 * US-101 : connexion en un seul écran (nom, prénom, date de naissance, mot de passe).
 * Un seul message quand la connexion échoue (CA-03) ; compte à rebours pendant la suspension (CA-06).
 * US-110 : « C'est votre première fois ? » d'abord, la photo de l'équipe, « Mot de passe oublié ? » sans clic.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const firstTimeId = useId()
  const formTitleId = useId()
  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message ? { message: location.state.message } : null)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [lockDeadline, setLockDeadline] = useState(null)
  const [sending, setSending] = useState(false)

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
      navigate('/accueil', { replace: true })
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
          <h1 className="text-[28px] leading-[35px] font-bold text-primary lg:text-[34px] lg:leading-[42px]">Connexion</h1>

          <section aria-labelledby={firstTimeId} className="flex flex-col gap-3 rounded-xl bg-section p-4">
            <h2 id={firstTimeId} className="text-[17px] font-semibold text-heading">
              C’est votre première fois ?
            </h2>
            <p className="text-[15px] leading-snug text-help">
              Créez d'abord votre mot de passe. Il vous suffit de votre nom, de votre prénom et de votre date de naissance.
            </p>
            <Link
              to="/connexion/premiere"
              className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-primary bg-surface px-5 font-semibold text-primary hover:bg-info-bg"
            >
              Créer mon mot de passe
            </Link>
          </section>

          <form aria-labelledby={formTitleId} onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <h2 id={formTitleId} className="text-[17px] font-semibold text-heading">
              Vous avez déjà un mot de passe
            </h2>
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
            <IdentityFields identity={identity} onChange={setIdentity} />
            <PasswordField
              label="Mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={!complete || sending || locked}>
              {locked ? `Suspendu temporairement (${formatMinutesSeconds(lockSeconds)})` : 'Me connecter'}
            </Button>
          </form>

          <div className="flex flex-col gap-1 border-t border-border pt-4 text-[15px] leading-snug">
            <p className="font-semibold text-heading">Mot de passe oublié ?</p>
            <p className="text-help">
              Demandez au service RH de réinitialiser votre accès. Vous créerez ensuite un nouveau mot de passe.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
