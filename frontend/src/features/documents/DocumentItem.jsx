import { useEffect, useId, useRef, useState } from 'react'
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

/** US-14 : confirmation « Supprimer ce document ? » affichée dans la carte du document. */
function DeleteConfirmation({ document, deleting, onConfirm, onCancel }) {
  const titleId = useId()
  const cancelRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    // Au centre de l'écran : sur mobile, la barre d'action collée en bas masquerait les boutons.
    panelRef.current?.scrollIntoView?.({ block: 'center' })
    cancelRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={panelRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-detail`}
      onKeyDown={(event) => event.key === 'Escape' && !deleting && onCancel()}
      className="flex flex-col gap-3 rounded-lg border border-error-border bg-error-bg p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">Supprimer ce document ?</p>
        <p id={`${titleId}-detail`} className="text-sm break-words text-help">
          « {document.original_name} » sera définitivement supprimé.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="min-h-11 rounded-lg bg-error-text font-semibold text-white disabled:opacity-60"
        >
          {deleting ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </div>
  )
}

/**
 * Un document de l'employé : icône (ou miniature), type, nom, taille.
 * `onDelete(document)` (US-14) ajoute le bouton « Supprimer » ; il renvoie `true` si le document est supprimé.
 * Sans `onDelete` (mise à jour soumise, administration), aucun bouton n'est affiché.
 */
export default function DocumentItem({ document, thumbnail, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteButtonRef = useRef(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function cancel() {
    setConfirming(false)
    // Le focus revient sur le bouton qui a ouvert la confirmation.
    setTimeout(() => deleteButtonRef.current?.focus())
  }

  async function confirm() {
    setDeleting(true)
    const deleted = await onDelete(document)
    // Supprimé : la carte disparaît de la liste ; sinon, l'écran affiche l'erreur et la carte reste.
    if (!deleted && mounted.current) {
      setDeleting(false)
      setConfirming(false)
    }
  }

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

      {onDelete && !confirming && (
        <div className="flex justify-end">
          <button
            ref={deleteButtonRef}
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Supprimer ${document.original_name}`}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-error-bg px-3 font-semibold text-error-text hover:bg-error-border/40"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
            Supprimer
          </button>
        </div>
      )}
      {confirming && <DeleteConfirmation document={document} deleting={deleting} onConfirm={confirm} onCancel={cancel} />}
    </li>
  )
}
