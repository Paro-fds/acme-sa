import { formatLocalDate } from '../../lib/format.js'
import CertificateStatus from './CertificateStatus.jsx'

/** Écran validé 13 : ce que chaque statut veut dire pour l'employé (RG-26). */
const STATUS_NOTES = {
  RECEIVED: 'En cours d’analyse par les RH (délai : 5 jours ouvrables).',
  IN_REVIEW: 'En cours d’analyse par les RH (délai : 5 jours ouvrables).',
  VALIDATED: 'Niveau validé dans votre dossier RH.',
}

/** US-303, US-207 : chaque certificat avec son statut, toujours visible. */
export default function CertificateList({ certificates }) {
  if (certificates.length === 0) {
    return <p className="rounded-xl bg-section p-4 text-help">Aucun certificat déposé pour l'instant.</p>
  }
  return (
    <ul aria-label="Certificats déposés" className="flex flex-col gap-3">
      {certificates.map((certificate) => (
        <li key={certificate.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-info-text">{certificate.type_label} · {certificate.level_label}</span>
              <p className="font-semibold break-words text-heading">{certificate.title}</p>
            </div>
            <CertificateStatus status={certificate.status} />
          </div>
          <p className="flex flex-wrap gap-x-3 rounded-lg bg-section px-3 py-2 text-sm text-help">
            <span>{certificate.institution}</span>
            <span>Promotion {certificate.year}</span>
          </p>
          {STATUS_NOTES[certificate.status] && <p className="text-sm text-help">{STATUS_NOTES[certificate.status]}</p>}
          <p className="text-sm text-muted">Déposé le {formatLocalDate(certificate.submitted_at)}</p>
        </li>
      ))}
    </ul>
  )
}
