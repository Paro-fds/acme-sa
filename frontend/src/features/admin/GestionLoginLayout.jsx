import logo from '../../assets/logo-acme.png'

export const SPACE_NAME = 'Espace de gestion'
const AUDIENCE = "Pour les équipes RH, les administrateurs et la direction d'ACME SA : certificats, dossiers des employés et pilotage."
const NETWORK = "Accès réservé au réseau de l'institution ou au VPN."

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-surface ${compact ? 'size-10' : 'size-13'}`}>
        <img src={logo} alt="ACME SA" width="42" height="42" className={compact ? 'size-8 object-contain' : 'size-10 object-contain'} />
      </span>
      <span className="font-semibold text-info-border">Portail Carrière</span>
    </div>
  )
}

function Network({ className = '' }) {
  return (
    <p className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="material-symbols-outlined text-lg" aria-hidden="true">lock</span>
      {NETWORK}
    </p>
  )
}

/**
 * US-111 : connexion de l'espace de gestion (RH, administrateurs, direction), sobre et soignée.
 * Ordinateur : panneau bleu de la charte à gauche, formulaire à droite ; téléphone : bandeau en haut.
 * Chaque étape a son écran : « Étape n sur 2 », son titre, puis son contenu.
 */
export default function GestionLoginLayout({ step, title, intro, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:flex-row">
      <aside className="flex flex-col gap-5 bg-primary px-5 pt-6 pb-7 text-white lg:w-[520px] lg:shrink-0 lg:justify-between lg:px-14 lg:py-14">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <div className="hidden lg:block">
          <Brand />
        </div>
        <div className="flex flex-col gap-3 lg:gap-5">
          <p className="text-[30px] leading-9 font-bold tracking-tight lg:text-[44px] lg:leading-[52px]">{SPACE_NAME}</p>
          <span className="h-[3px] w-12 bg-brand-red" aria-hidden="true" />
          <p className="hidden max-w-sm text-lg leading-relaxed text-info-bg lg:block">{AUDIENCE}</p>
        </div>
        <Network className="hidden text-info-border lg:flex" />
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 items-start justify-center px-5 py-7 lg:items-center lg:px-12">
          <div className="flex w-full max-w-[400px] flex-col gap-7">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted">Étape {step} sur 2</p>
              <h1 className="text-[26px] leading-8 font-bold text-heading lg:text-[32px] lg:leading-10">{title}</h1>
              {intro && <p className="leading-relaxed text-help">{intro}</p>}
            </div>
            {children}
          </div>
        </main>
        <footer className="border-t border-border px-5 py-4 lg:hidden">
          <Network className="text-help" />
        </footer>
      </div>
    </div>
  )
}

/** Pied d'étape : texte d'aide séparé du formulaire par un filet. */
export function LoginNote({ children }) {
  return <div className="flex flex-col gap-3 border-t border-border pt-5 text-[15px] leading-snug text-help">{children}</div>
}
