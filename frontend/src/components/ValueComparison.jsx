import { displayValue } from '../lib/format.js'

/** US-11 : « Ancienne → Nouvelle » (ancienne grisée et barrée, nouvelle en gras sur fond vert pâle). */
export default function ValueComparison({ label, icon = 'edit', oldValue, newValue }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-info-text" aria-hidden="true">{icon}</span>
          <h4 className="font-semibold text-heading">{label}</h4>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-xs font-semibold text-info-text">
          <span className="size-1.5 rounded-full bg-info-text" aria-hidden="true" />
          Modifié
        </span>
      </div>

      <div className="flex flex-col gap-0.5 rounded-lg bg-canvas px-3 py-2">
        <span className="text-xs font-semibold text-muted">Ancienne :</span>
        {oldValue ? (
          <s className="break-words text-muted">{oldValue}</s>
        ) : (
          <span className="text-muted italic">{displayValue('')}</span>
        )}
      </div>
      <span className="material-symbols-outlined self-center text-[18px] text-muted" aria-hidden="true">arrow_downward</span>
      <div className="flex flex-col gap-0.5 rounded-lg border border-status-done-border bg-status-done-bg px-3 py-2">
        <span className="text-xs font-semibold text-status-done-text">Nouvelle :</span>
        {newValue ? (
          <strong className="break-words text-heading">{newValue}</strong>
        ) : (
          <span className="text-heading italic">{displayValue('')}</span>
        )}
      </div>
    </article>
  )
}
