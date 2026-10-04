import { useId } from 'react'

/** Bloc titré du dossier admin (US-20, US-21). */
export default function Block({ icon, title, aside, children }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-info-text" aria-hidden="true">{icon}</span>
        <h3 id={titleId} className="flex-1 text-lg font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
