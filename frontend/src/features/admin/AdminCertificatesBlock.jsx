import { useState } from 'react'
import { certificateFileUrl } from '../../api/admin.js'
import { formatLocalDate } from '../../lib/format.js'

function HistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-xs text-muted italic">Aucun historique enregistré.</p>
  }

  return (
    <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-section p-3 text-xs">
      {history.map((entry, idx) => (
        <li key={entry.id ?? idx} className="py-1.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-1 text-heading">
            <span className="font-semibold">{entry.action}</span>
            <span className="text-muted">{formatLocalDate(entry.at)}</span>
          </div>
          <p className="text-help">{entry.details ?? (entry.actor_name ? `Par ${entry.actor_name}` : '')}</p>
        </li>
      ))}
    </ul>
  )
}

function CertificateCard({ cert }) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold text-help uppercase">
            {cert.type_label} · {cert.level_label}
          </span>
          <h3 className="text-base font-bold text-heading break-words">{cert.title}</h3>
          <p className="text-sm text-help">
            {cert.institution} · Promotion {cert.year}
          </p>
        </div>
        <div>
          {cert.is_archived ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-section px-2.5 py-0.5 text-xs font-semibold text-muted">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">archive</span>
              Archivé (remplacé)
            </span>
          ) : cert.status === 'VALIDATED' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-status-done-border bg-status-done-bg px-2.5 py-0.5 text-xs font-semibold text-status-done-text">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>
              Validé
            </span>
          ) : cert.status === 'IN_REVIEW' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info-text">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">hourglass_top</span>
              En vérification
            </span>
          ) : cert.status === 'TO_CORRECT' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-status-progress-border bg-status-progress-bg px-2.5 py-0.5 text-xs font-semibold text-status-progress-text">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
              À corriger
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-section px-2.5 py-0.5 text-xs font-semibold text-help">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">inbox</span>
              Reçu
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 text-xs text-help">
        <div>
          {cert.decided_at && cert.decided_by && (
            <span>
              Validé le {formatLocalDate(cert.decided_at)} par {cert.decided_by}
            </span>
          )}
          {!cert.decided_at && cert.assigned_to && (
            <span>Pris en charge par {cert.assigned_to}</span>
          )}
          {!cert.decided_at && !cert.assigned_to && (
            <span>Déposé le {formatLocalDate(cert.submitted_at)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={certificateFileUrl(cert.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>
            Voir le document
          </a>
          {cert.history && cert.history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-help hover:text-heading hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
              {showHistory ? 'Masquer l’historique' : 'Historique des décisions'}
            </button>
          )}
        </div>
      </div>

      {showHistory && <HistoryTimeline history={cert.history} />}
    </li>
  )
}

/** US-304 & A7 : Bloc des certificats prouvés d'un employé, y compris ceux remplacés/archivés. */
export default function AdminCertificatesBlock({ certificates = [] }) {
  if (!certificates || certificates.length === 0) {
    return null
  }

  return (
    <section aria-label="Certificats" className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border bg-section px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-info-text" aria-hidden="true">workspace_premium</span>
          <h2 className="text-base font-semibold">Certificats</h2>
        </div>
        <span className="text-xs font-medium text-help">
          {certificates.length} certificat{certificates.length > 1 ? 's' : ''} enregistré{certificates.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-4 sm:p-6">
        <ul aria-label="Liste des certificats" className="flex flex-col gap-4">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </ul>
      </div>
    </section>
  )
}
