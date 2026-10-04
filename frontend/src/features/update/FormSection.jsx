import { useId, useState } from 'react'

function changesLabel(count) {
  if (count === 0) return 'Aucune modification'
  return count === 1 ? '1 modification en cours' : `${count} modifications en cours`
}

/** US-09 : section repliable du formulaire, avec le nombre de modifications en cours. */
export default function FormSection({ icon, title, changes, children }) {
  const [open, setOpen] = useState(true)
  const titleId = useId()
  const contentId = useId()

  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex min-h-16 w-full items-center gap-3 bg-section px-4 py-3 text-left"
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            changes > 0 ? 'bg-primary text-white' : 'bg-surface text-info-text'
          }`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} className="text-lg font-semibold text-heading">{title}</span>
          <span className="text-sm text-help">{changesLabel(changes)}</span>
        </span>
        <span className="material-symbols-outlined text-muted" aria-hidden="true">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div id={contentId} className="flex flex-col gap-2 p-2">
          {children}
        </div>
      )}
    </section>
  )
}
