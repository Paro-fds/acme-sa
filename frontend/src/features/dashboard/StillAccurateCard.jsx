import { useId, useState } from 'react'
import { Link } from 'react-router'
import { confirmStillAccurate } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import { useUnauthorizedRedirect } from '../../lib/useLoader.js'

/**
 * US-205 : une information non confirmée depuis 12 mois est périmée (RG-60). La carte la signale sur l'Accueil,
 * sans rien bloquer (choix du 2026-10-11) ; « Oui » confirme tout en un clic (CA-02). Le rappel 30 jours avant
 * partira par WhatsApp ou email avec US-701.
 */
export default function StillAccurateCard({ freshness }) {
  const titleId = useId()
  const redirect = useUnauthorizedRedirect()
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const stale = freshness.items.filter((item) => item.state === 'STALE')

  if (done) return <Alert tone="success">Merci, vos informations sont confirmées pour un an.</Alert>
  if (stale.length === 0) return null

  async function confirm() {
    setSending(true)
    setError(null)
    try {
      await confirmStillAccurate()
      setDone(true)
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
      setSending(false)
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-bg/60 text-accent-icon" aria-hidden="true">
          <span className="material-symbols-outlined text-xl">update</span>
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 id={titleId} className="text-lg font-bold text-balance">
            Ces informations sont-elles toujours exactes ?
          </h3>
          <p className="text-sm text-help">Vous ne les avez pas confirmées depuis plus d’un an.</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {stale.map((item) => (
          <li key={item.key} className="flex flex-col rounded-lg bg-section p-3">
            <span className="text-sm text-help">{item.label}</span>
            <span className="font-semibold break-words text-heading">{item.value}</span>
          </li>
        ))}
      </ul>
      {error && <Alert>{error.message}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="rounded-xl sm:w-auto" onClick={confirm} disabled={sending}>
          <span className="material-symbols-outlined" aria-hidden="true">check</span>
          Oui, toujours exactes
        </Button>
        <Link
          to="/profil"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-primary hover:bg-info-bg"
        >
          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
          Non, je corrige
        </Link>
      </div>
    </section>
  )
}
