import { useId } from 'react'

/** US-201 CA-02 : « Votre dossier est complet à X % » (8 éléments, RG-01 ; calcul RG-05). */
export default function CompletionCard({ completion }) {
  const titleId = useId()
  const { percent, complete, total } = completion
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <h2 id={titleId} className="text-xl font-bold">
        Votre dossier est complet à {percent} %
      </h2>
      <div
        role="progressbar"
        aria-label="Progression du dossier"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 w-full overflow-hidden rounded-full bg-status-neutral-bg"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-help">
        {complete} élément{complete > 1 ? 's' : ''} complété{complete > 1 ? 's' : ''} sur {total}
      </p>
    </section>
  )
}
