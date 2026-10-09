import logo from '../../assets/logo-acme.png'

/**
 * US-107 (écran validé A01, `code.html`) : carte blanche de 480 px sur fond bleu de la charte, centrée,
 * logo, « Espace RH », et la mention du réseau sous la carte.
 */
export default function RhLoginCard({ children }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-primary p-4">
      <div className="w-full max-w-[480px]">
        <main className="flex flex-col gap-7 rounded-xl border border-section bg-surface p-6 shadow-2xl sm:p-10">
          <div className="flex flex-col items-center gap-2">
            <img src={logo} alt="ACME SA" width="48" height="48" className="h-12 w-auto object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-primary">Espace RH</h1>
          </div>
          {children}
        </main>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-info-bg">
          <span className="material-symbols-outlined text-[18px] text-info-border" aria-hidden="true">lock</span>
          Espace réservé au réseau de l'institution ou au VPN.
        </p>
      </div>
    </div>
  )
}

/** Une étape numérotée de la carte : `state` = 'active' | 'done' | 'waiting'. */
export function LoginStep({ number, title, state, children }) {
  const active = state === 'active'
  return (
    <div className="flex flex-col gap-4">
      <h2
        className={`flex items-center gap-2 border-b border-section pb-1 text-sm font-semibold tracking-wider uppercase ${
          active ? 'text-primary' : 'text-muted'
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
            active ? 'bg-primary text-white' : 'bg-status-neutral-bg text-help'
          }`}
        >
          {state === 'done' ? <span className="material-symbols-outlined text-[16px]">check</span> : number}
        </span>
        <span>
          {title}
          {state === 'done' && <span className="sr-only"> (fait)</span>}
        </span>
      </h2>
      {children}
    </div>
  )
}

/** Séparateur « Double authentification » entre les deux étapes. */
export function StepDivider() {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      Double authentification
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
