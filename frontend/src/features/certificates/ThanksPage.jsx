import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { sendFeedback } from '../../api/certificates.js'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import { formatSize } from '../../lib/format.js'
import CertificateStatus from './CertificateStatus.jsx'
import { CERTIFICATES_PATH, DEPOSIT_PATH } from './paths.js'

/** US-302 CA-03 : trois réponses, en un clic ; ignorer la question ne change rien. */
const RATINGS = [
  { value: 3, icon: 'sentiment_satisfied', label: 'Facile' },
  { value: 2, icon: 'sentiment_neutral', label: 'Correct' },
  { value: 1, icon: 'sentiment_dissatisfied', label: 'Difficile' },
]

function Feedback({ certificateId }) {
  const [sent, setSent] = useState(false)

  async function answer(rating) {
    setSent(true)
    try {
      await sendFeedback(certificateId, rating)
    } catch {
      // L'avis est facultatif : un échec ne gêne pas l'employé.
    }
  }

  if (sent) return <p role="status" className="text-center font-semibold text-status-done-text">Merci pour votre avis.</p>
  return (
    <section aria-labelledby="feedback-title" className="flex flex-col gap-3 rounded-xl bg-section p-4">
      <h3 id="feedback-title" className="text-center font-semibold">
        Comment s'est passé votre dépôt ?
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {RATINGS.map((rating) => (
          <button
            key={rating.value}
            type="button"
            onClick={() => answer(rating.value)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg bg-surface font-semibold text-heading hover:bg-info-bg"
          >
            <span className="material-symbols-outlined text-[28px] text-primary" aria-hidden="true">{rating.icon}</span>
            {rating.label}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-help">Facultatif</p>
    </section>
  )
}

/** US-302 : remerciement, récapitulatif, statut et ce que le certificat débloque (D-10). */
export default function ThanksPage() {
  const { state } = useLocation()
  if (!state?.certificate) return <Navigate to={CERTIFICATES_PATH} replace />
  const { certificate, fileName, fileSize, firstName } = state

  return (
    <Page account title="Certificat envoyé">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-status-done-bg text-status-done-text" aria-hidden="true">
          <span className="material-symbols-outlined text-[36px]">check_circle</span>
        </span>
        <h2 className="text-[26px] leading-8 font-bold">{firstName ? `Merci, ${firstName} !` : 'Merci !'}</h2>
        <p>Votre document a bien été transmis au service des Ressources Humaines.</p>
      </div>
      <Mascot role="Conseil RH">
        « Félicitations pour cette démarche. Chaque titre validé renforce vos perspectives au sein du réseau. »
      </Mascot>

      <section aria-labelledby="summary-title" className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
        <h3 id="summary-title" className="text-lg font-semibold">
          Récapitulatif du dépôt
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-help">Intitulé</dt>
            <dd className="font-semibold break-words text-heading">{certificate.title}</dd>
          </div>
          <div>
            <dt className="text-sm text-help">Établissement</dt>
            <dd className="font-semibold break-words text-heading">{certificate.institution}</dd>
          </div>
          <div>
            <dt className="text-sm text-help">Année d'obtention</dt>
            <dd className="font-semibold text-heading">{certificate.year}</dd>
          </div>
          <div>
            <dt className="text-sm text-help">Fichier</dt>
            <dd className="break-words text-heading">
              {fileName} · {formatSize(fileSize)}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-section p-3">
          <span className="text-sm text-help">Statut actuel</span>
          <CertificateStatus status={certificate.status} />
        </div>
        <p className="text-sm font-semibold text-heading">Réponse sous 5 jours ouvrables</p>
        <p className="text-sm text-help">Une question sur ce dossier ? Adressez-vous au service RH de votre agence.</p>
      </section>

      <section aria-labelledby="unlocks-title" className="flex flex-col gap-2 rounded-xl bg-info-bg p-4 text-info-text">
        <h3 id="unlocks-title" className="text-lg font-semibold">
          Ce que ce certificat débloque
        </h3>
        {certificate.unlocks.level && <p>Une fois validé, votre niveau d’études devient {certificate.unlocks.level}.</p>}
        <p>{certificate.unlocks.searchable}</p>
      </section>

      <Feedback certificateId={certificate.id} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to={CERTIFICATES_PATH}
          className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
        >
          Voir mes certificats
        </Link>
        <Link
          to={DEPOSIT_PATH}
          className="flex min-h-12 flex-1 items-center justify-center rounded-lg border-[1.5px] border-primary px-5 font-semibold text-primary hover:bg-info-bg"
        >
          Déposer un autre certificat
        </Link>
      </div>
    </Page>
  )
}
