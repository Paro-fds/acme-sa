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
    text: "Pour traiter équitablement les promotions internes et pourvoir en priorité les postes vacants dans l'ensemble de nos agences.",
  },
  {
    icon: 'health_and_safety',
    title: "Contact d'urgence & assurances",
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
    <details className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary">
        <span className="material-symbols-outlined" aria-hidden="true">description</span>
        Lire la mention d'information complète
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <p>
          <strong>Ce que nous collectons :</strong> vos coordonnées (téléphone, adresse, email), le nom, le lien et le
          téléphone d'une personne à prévenir en cas d'urgence, et votre niveau d'études.
        </p>
        <p>
          <strong>Pourquoi :</strong> traiter équitablement les promotions internes, pourvoir les postes vacants, prévenir
          un proche en cas d'urgence et gérer vos droits aux assurances du personnel.
        </p>
        <p>
          <strong>Qui y a accès :</strong> uniquement la Direction des Ressources Humaines d'ACME SA. Ces informations ne
          sont ni cédées ni partagées à des tiers extérieurs.
        </p>
        <p>
          <strong>Vos informations :</strong> vous pouvez les consulter et les corriger à tout moment dans « Mon profil ».
          Pour toute question, adressez-vous au service RH de votre agence.
        </p>
      </div>
    </details>
  )
}

function Checkbox({ checked, onChange, title, aside, children }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-primary"
      />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-heading">{title}</span>
          {aside}
        </div>
        <label htmlFor={id} className="cursor-pointer">
          {children}
        </label>
      </div>
    </div>
  )
}

/** US-202 CA-01, maquette 05 : mention d'information et consentement, une seule fois, avant toute saisie (D-09). */
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
      <Mascot role="Transparence et protection de vos données personnelles">
        Votre parcours mérite une écoute respectueuse et sécurisée.
      </Mascot>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Avant de commencer</h2>
        <p>Avant de compléter votre dossier, voici ce que nous faisons de vos informations.</p>
      </div>

      <section aria-labelledby="why" className="flex flex-col gap-3">
        <h3 id="why" className="text-lg font-semibold">
          Pourquoi nous collectons ces données ?
        </h3>
        {REASONS.map((reason) => (
          <div key={reason.title} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
              <span className="material-symbols-outlined">{reason.icon}</span>
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-heading">{reason.title}</p>
              <p className="text-sm">{reason.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="who" className="flex flex-col gap-1 rounded-xl bg-info-bg p-4">
        <h3 id="who" className="text-lg font-semibold text-heading">
          Qui a accès à ces informations ?
        </h3>
        <p>
          Uniquement la Direction des Ressources Humaines d'ACME SA. Vos données ne sont <strong>jamais cédées ni partagées</strong>{' '}
          à des tiers extérieurs.
        </p>
      </section>

      <FullNotice />

      <section aria-label="Engagements et préférences" className="flex flex-col gap-3">
        <Checkbox
          checked={notice}
          onChange={setNotice}
          title="Utilisation des données internes"
          aside={<span className="rounded-full bg-error-bg px-2 py-0.5 text-xs font-semibold text-error-text">Obligatoire</span>}
        >
          J'ai lu et j'accepte l'utilisation de ces informations pour ma gestion de carrière et ma protection au sein d'ACME SA.
        </Checkbox>
        <Checkbox
          checked={whatsapp}
          onChange={setWhatsapp}
          title="Alertes WhatsApp"
          aside={<span className="rounded-full bg-status-neutral-bg px-2 py-0.5 text-xs font-semibold text-help">Facultatif</span>}
        >
          J'accepte de recevoir des messages WhatsApp du portail (suivi de mes certificats, rappels).
        </Checkbox>
      </section>
      {error && <Alert>{error}</Alert>}
    </>,
    <>
      {!notice && (
        <p className="flex items-center justify-center gap-1 text-sm text-help">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
          Veuillez cocher la case obligatoire pour continuer
        </p>
      )}
      <Button onClick={handleContinue} disabled={!notice || sending}>
        Continuer vers mon espace
        <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </Button>
    </>,
  )
}
