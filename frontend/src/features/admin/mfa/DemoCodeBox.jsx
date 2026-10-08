import { METHODS } from './methods.js'

/**
 * Démonstrateur : aucun message ne part réellement ; le code « reçu » s'affiche ici (US-001, US-102).
 * En production, l'API ne renvoie jamais le code et cette boîte n'apparaît pas.
 */
export default function DemoCodeBox({ sent }) {
  if (!sent?.demo_code) return null
  const spaced = `${sent.demo_code.slice(0, 3)} ${sent.demo_code.slice(3)}`
  return (
    <aside
      aria-label="Boîte de démonstration"
      className="flex flex-col gap-1 rounded-lg border border-dashed border-status-progress-border bg-status-progress-bg p-3 text-status-progress-text"
    >
      <p className="flex items-center gap-1 text-sm font-semibold">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">science</span>
        Démonstration · message simulé
      </p>
      <p className="text-sm">
        En production, ce code arriverait {METHODS[sent.method].channel} au {sent.destination}.
      </p>
      <p className="font-mono text-2xl font-bold tracking-[0.2em] tabular-nums" aria-label={`Code ${sent.demo_code}`}>
        {spaced}
      </p>
    </aside>
  )
}
