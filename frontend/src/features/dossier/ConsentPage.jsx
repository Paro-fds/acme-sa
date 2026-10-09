import { useEffect, useId, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getDossier, giveConsent } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

const REASONS = [
  {
    icon: 'school',
    title: "Niveau d'études & diplômes",
    subtitle: 'Parcours et compétences',
    text: "Pour traiter équitablement les promotions internes et pourvoir en priorité les postes vacants dans l'ensemble de nos agences.",
  },
  {
    icon: 'health_and_safety',
    title: "Contact d'urgence & assurances",
    subtitle: 'Sécurité et prévoyance',
    text: "Pour prévenir un proche sans délai en cas d'urgence et garantir vos droits aux assurances du personnel.",
  },
]

/**
 * Mention d'information complète (EF-208, ENF-10).
 * ❓ Texte rédigé par le développeur à partir du cahier des charges (ENF-10, D-09) : à valider par la DRH.
 * Toute modification du texte change `NOTICE_VERSION` côté serveur (`app/dossier/domain/dossier.py`).
 */
function FullNotice() {
  return (
    <details className="group rounded-lg bg-section">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-2 py-1 text-sm font-semibold text-primary hover:bg-info-bg">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">description</span>
          Lire la mention d'information complète
        </span>
        <span className="material-symbols-outlined text-[20px] transition-transform group-open:rotate-90" aria-hidden="true">
          arrow_forward_ios
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pt-2 pb-4 text-sm text-help">
        <p>
          <strong className="text-heading">Ce que nous collectons :</strong> vos coordonnées (téléphone, adresse, email),
          le nom, le lien et le téléphone d'une personne à prévenir en cas d'urgence, et votre niveau d'études.
        </p>
        <p>
          <strong className="text-heading">Pourquoi :</strong> traiter équitablement les promotions internes, pourvoir les
          postes vacants, prévenir un proche en cas d'urgence et gérer vos droits aux assurances du personnel.
        </p>
        <p>
          <strong className="text-heading">Qui y a accès :</strong> uniquement la Direction des Ressources Humaines d'ACME
          SA. Ces informations ne sont ni cédées ni partagées à des tiers extérieurs.
        </p>
        <p>
          <strong className="text-heading">Vos informations :</strong> vous pouvez les consulter et les corriger à tout
          moment dans « Mon profil ». Pour toute question, adressez-vous au service RH de votre agence.
        </p>
      </div>
    </details>
  )
}

/** Case de l'écran 05 : toute la carte se touche ; case de 24 px, bleue une fois cochée. */
function Checkbox({ checked, onChange, title, aside, children }) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-start gap-4 rounded-xl bg-surface p-4 shadow-card select-none"
    >
      <span className="relative mt-0.5 flex shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 z-10 size-6 cursor-pointer opacity-0"
        />
        <span
          className="flex size-6 items-center justify-center rounded bg-info-bg shadow-inner peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
          aria-hidden="true"
        >
          <span className={`material-symbols-outlined text-[18px] font-bold text-white ${checked ? '' : 'opacity-0'}`}>
            check
          </span>
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-heading">{title}</span>
          {aside}
        </span>
        <span className="text-sm leading-snug text-help">{children}</span>
      </span>
    </label>
  )
}

/** US-202 CA-01, écran validé 05 : mention d'information et consentement, une seule fois, avant toute saisie (D-09). */
export default function ConsentPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const next = state?.next ?? '/accueil'
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const { data, error: loadError, loading } = useLoader(getDossier)
  const [notice, setNotice] = useState(false)
  const [whatsapp, setWhatsapp] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const alreadyGiven = Boolean(data?.consent.information_notice_at)

  useEffect(() => {
    if (alreadyGiven) navigate(next, { replace: true })
  }, [alreadyGiven, navigate, next])

  async function handleContinue() {
    setSending(true)
    setError(null)
    try {
      await giveConsent({ information_notice: notice, whatsapp })
      navigate(next, { replace: true })
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError.message)
      setSending(false)
    }
  }

  const page = (children, actions) => (
    <Page account nav={false} title="Bienvenue" actions={actions}>
      {children}
    </Page>
  )
  if (loading || alreadyGiven) return page(<p role="status">Chargement…</p>)
  if (loadError) return page(<Alert>{loadError.message}</Alert>)

  return page(
    <>
      <p className="flex flex-wrap items-center justify-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-3 py-1 text-sm text-help shadow-card">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">account_balance</span>
          Institution de Microfinance — Haïti
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-active">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock_person</span>
          Étape préalable unique · 1re connexion
        </span>
      </p>

      <Mascot role="Transparence et protection de vos données personnelles">
        Votre parcours mérite une écoute respectueuse et sécurisée.
      </Mascot>
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] leading-[34px] font-bold tracking-tight text-primary">Avant de commencer</h2>
        <p className="leading-relaxed text-help">
          Avant de compléter votre dossier, voici ce que nous faisons de vos informations.
        </p>
      </div>

      <section aria-labelledby="why" className="flex flex-col gap-4">
        <h3 id="why" className="flex items-center gap-1 text-lg font-semibold text-primary">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">help_center</span>
          Pourquoi nous collectons ces données ?
        </h3>
        {REASONS.map((reason) => (
          <div key={reason.title} className="flex flex-col gap-1 rounded-xl bg-surface p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-bg text-primary"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[22px]">{reason.icon}</span>
              </span>
              <span className="flex flex-col">
                <span className="font-bold text-heading">{reason.title}</span>
                <span className="text-sm text-help">{reason.subtitle}</span>
              </span>
            </div>
            <p className="pl-12 text-sm leading-relaxed text-help">{reason.text}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="who" className="flex items-start gap-2 rounded-xl bg-info-bg p-4 shadow-card">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary" aria-hidden="true">verified_user</span>
        <div className="flex flex-col gap-0.5">
          <h3 id="who" className="font-bold text-primary">
            Qui a accès à ces informations ?
          </h3>
          <p className="text-sm leading-relaxed text-help">
            Uniquement la Direction des Ressources Humaines d'ACME SA. Vos données ne sont{' '}
            <strong className="font-semibold text-heading">jamais cédées ni partagées à des tiers</strong> extérieurs.
          </p>
        </div>
      </section>

      <FullNotice />

      <section aria-label="Engagements et préférences" className="flex flex-col gap-4">
        <p className="flex items-center justify-between text-sm">
          <span className="font-bold tracking-wider text-help uppercase">Engagements & préférences</span>
          <span className="font-semibold text-primary">1 requis</span>
        </p>
        <Checkbox
          checked={notice}
          onChange={setNotice}
          title="Utilisation des données internes"
          aside={
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-active">
              Obligatoire *
            </span>
          }
        >
          J'ai lu et j'accepte l'utilisation de ces informations pour ma gestion de carrière et ma protection au sein d'ACME
          SA.
        </Checkbox>
        <Checkbox
          checked={whatsapp}
          onChange={setWhatsapp}
          title={
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">chat</span>
              Alertes WhatsApp
            </span>
          }
          aside={<span className="rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-help">Facultatif</span>}
        >
          J'accepte de recevoir des messages WhatsApp du portail (suivi de mes certificats, rappels).
        </Checkbox>
      </section>
      {error && <Alert>{error}</Alert>}
    </>,
    <>
      {!notice && (
        <p className="flex items-center justify-center gap-1 text-sm text-help">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">info</span>
          Veuillez cocher la case obligatoire pour continuer
        </p>
      )}
      <Button onClick={handleContinue} disabled={!notice || sending} className="rounded-xl shadow-md">
        Continuer vers mon espace
        <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </Button>
    </>,
  )
}
