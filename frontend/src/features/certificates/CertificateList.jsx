import { certificateFileUrl } from '../../api/certificates.js'
import { formatLocalDate } from '../../lib/format.js'
import CertificateStatus from './CertificateStatus.jsx'

/** Écran validé 13 : ce que chaque statut veut dire pour l'employé (RG-26). */
const STATUS_NOTES = {
  RECEIVED: 'En cours d’analyse par les RH (délai : 5 jours ouvrables).',
  IN_REVIEW: 'En cours d’analyse par les RH (délai : 5 jours ouvrables).',
  VALIDATED: 'Niveau validé dans votre dossier RH.',
}

/** US-303, US-304, US-118 : chaque certificat avec son statut et son fichier, y compris s'il est archivé/remplacé. */
export default function CertificateList({ certificates, onDelete }) {
  if (certificates.length === 0) {
    return <p className="rounded-xl bg-section p-4 text-help">Aucun certificat déposé pour l'instant.</p>
  }
  return (
    <ul aria-label="Certificats déposés" className="flex flex-col gap-3">
      {certificates.map((certificate) => (
        <li key={certificate.id} className="flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-info-text">{certificate.type_label} · {certificate.level_label}</span>
              <p className="font-semibold break-words text-heading">{certificate.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {certificate.is_archived ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-section px-2.5 py-0.5 text-xs font-semibold text-muted">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">archive</span>
                  Archivé (remplacé)
                </span>
              ) : (
                <CertificateStatus status={certificate.status} />
              )}
            </div>
          </div>
          <p className="flex flex-wrap gap-x-3 rounded-lg bg-section px-3 py-2 text-sm text-help">
            <span>{certificate.institution}</span>
            <span>Promotion {certificate.year}</span>
          </p>
          {certificate.is_archived ? (
            <p className="text-sm text-help italic">Ce certificat a été remplacé mais reste conservé comme preuve dans votre dossier RH.</p>
          ) : (
            STATUS_NOTES[certificate.status] && <p className="text-sm text-help">{STATUS_NOTES[certificate.status]}</p>
          )}
          <a
            href={certificateFileUrl(certificate.id)}
            target="_blank"
            rel="noopener"
            aria-label={`Voir le fichier de ${certificate.title}`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg bg-info-bg px-3 font-semibold text-primary hover:bg-info-border/40"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">visibility</span>
            Voir le fichier
          </a>
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Déposé le {formatLocalDate(certificate.submitted_at)}</span>
            {onDelete && certificate.status !== 'VALIDATED' && (
              <button
                type="button"
                onClick={() => onDelete(certificate.id)}
                className="text-xs font-medium text-warning-text hover:underline"
              >
                Supprimer
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
