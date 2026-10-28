import logo from '../assets/logo-acme.png'

/** US-110, US-1006 : en-tête des pages publiques (accueil, connexion) : logo, « PAM », une action à droite. */
export default function PublicHeader({ action }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="ACME SA" width="40" height="40" className="size-10 object-contain" />
          <span className="text-lg font-bold whitespace-nowrap text-primary" title="Plateforme ACME Multifonction">PAM</span>
        </div>
        {action}
      </div>
    </header>
  )
}
