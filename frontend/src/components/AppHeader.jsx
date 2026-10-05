import { useNavigate } from 'react-router'
import logo from '../assets/logo-acme.png'
import AccountMenu from './AccountMenu.jsx'

/**
 * En-tête unique de l'application (logo, titre court, retour optionnel).
 * `account` : écran connecté, affiche l'avatar et son menu (US-04) ; `account="admin"` pour l'espace admin (US-15).
 */
export default function AppHeader({ title, backTo, actions, account = false, width = 'max-w-3xl' }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className={`mx-auto flex h-16 ${width} items-center gap-3 px-4`}>
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label="Retour"
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-heading hover:bg-canvas"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
        )}
        <img src={logo} alt="ACME SA" width="40" height="40" className="size-10 shrink-0 rounded-full" />
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {actions}
        {account && <AccountMenu space={account === 'admin' ? 'admin' : 'employee'} />}
      </div>
    </header>
  )
}
