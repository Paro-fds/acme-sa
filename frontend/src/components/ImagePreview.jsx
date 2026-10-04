import { useEffect, useId, useRef } from 'react'

/** Aperçu plein écran d'une image (US-07 ; réutilisable côté administration, US-21). */
export default function ImagePreview({ src, title, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-heading/95"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <p id={titleId} className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer l’aperçu"
          className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <img src={src} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
      </div>
    </div>
  )
}
