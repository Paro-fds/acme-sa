import { formatSize } from '../../lib/format.js'

function FileIcon({ document, thumbnail }) {
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={`Aperçu de ${document.original_name}`}
        className="size-12 shrink-0 rounded-xl border border-border object-cover"
      />
    )
  }
  const isPdf = document.content_type === 'application/pdf'
  return (
    <span
      role="img"
      aria-label={isPdf ? 'PDF' : 'Image'}
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
        isPdf ? 'bg-error-bg text-error-text' : 'bg-info-bg text-info-text'
      }`}
    >
      <span className="material-symbols-outlined text-[28px]" aria-hidden="true">{isPdf ? 'picture_as_pdf' : 'image'}</span>
    </span>
  )
}

/** Un document de l'employé : icône (ou miniature), type, nom, taille ; `actions` pour Voir / Supprimer. */
export default function DocumentItem({ document, thumbnail, actions }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <FileIcon document={document} thumbnail={thumbnail} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-info-bg px-2 py-0.5 text-xs font-semibold text-info-text">{document.type_label}</span>
            <span className="text-xs text-muted">{formatSize(document.size_bytes)}</span>
          </div>
          <p className="truncate font-semibold text-heading" title={document.original_name}>{document.original_name}</p>
          <p className="flex items-center gap-1.5 text-sm text-status-done-text">
            <span className="size-2 rounded-full bg-status-done-dot" aria-hidden="true" />
            Envoyé
          </p>
        </div>
      </div>
      {actions && <div className="flex justify-end gap-2">{actions}</div>}
    </li>
  )
}
