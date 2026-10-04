export const UPDATE_STEPS = ['Informations', 'Documents', 'Vérification', 'Confirmation']

/** Progression du parcours de mise à jour (« Étape 1 sur 4 : Informations »). */
export default function Stepper({ current, steps = UPDATE_STEPS }) {
  const index = steps.indexOf(current)

  return (
    <nav aria-label="Progression" className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-sm font-semibold text-help">
        Étape {index + 1} sur {steps.length} : {current}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-status-neutral-bg" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-4 gap-1 text-center" aria-hidden="true">
        {steps.map((step, position) => {
          const done = position < index
          const isCurrent = position === index
          const badge = done
            ? 'bg-status-done-dot text-white'
            : isCurrent
              ? 'bg-primary text-white'
              : 'bg-status-neutral-bg text-help'
          return (
            <li key={step} className={`flex flex-col items-center gap-0.5 ${done || isCurrent ? '' : 'opacity-50'}`}>
              <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${badge}`}>
                {done ? <span className="material-symbols-outlined text-[16px]">check</span> : position + 1}
              </span>
              <span className={`max-w-full truncate text-xs ${isCurrent ? 'font-bold text-primary' : 'text-help'}`}>
                {step}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
