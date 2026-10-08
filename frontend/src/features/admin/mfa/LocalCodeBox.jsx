import { METHODS } from './methods.js'

/**
 * US-102 : poste du développeur et tests automatiques (`APP_ENV=local`) seulement. Aucun message ne part ;
 * l'API rend le code pour qu'il s'affiche ici. En ligne, l'API ne renvoie jamais le code et cette boîte n'apparaît pas.
 */
export default function LocalCodeBox({ sent }) {
  if (!sent?.local_code) return null
  const spaced = `${sent.local_code.slice(0, 3)} ${sent.local_code.slice(3)}`
  return (
    <aside
      aria-label="Message non envoyé"
      className="flex flex-col gap-1 rounded-lg border border-dashed border-status-progress-border bg-status-progress-bg p-3 text-status-progress-text"
    >
      <p className="flex items-center gap-1 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">terminal</span>
        Poste de développement · message non envoyé
      </p>
      <p className="text-sm">
        En ligne, ce code partirait {METHODS[sent.method].channel} au {sent.destination}.
      </p>
      <p className="font-mono text-2xl font-bold tracking-[0.2em] tabular-nums" aria-label={`Code ${sent.local_code}`}>
        {spaced}
      </p>
    </aside>
  )
}
