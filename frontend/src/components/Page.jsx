import { Link } from 'react-router'
import logo from '../assets/logo-acme.png'
import AccountMenu from './AccountMenu.jsx'
import AppHeader from './AppHeader.jsx'
import BottomNav from './BottomNav.jsx'

/** US-207 CA-02 : en-tête « Portail Carrière » de l'espace employé (écrans validés 06 → 13). */
function EmployeeHeader() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <img src={logo} alt="ACME SA" width="40" height="40" className="size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-heading">Portail Carrière</span>
          <span className="truncate text-sm text-help">Institution de Microfinance — Haïti</span>
        </div>
        <AccountMenu space="employee" />
      </div>
    </header>
  )
}

/**
 * Mise en page commune : en-tête, contenu centré, barre d'action collée en bas sur mobile.
 * `account` : écran connecté ; `account="admin"` pour l'espace admin. Un écran employé (`account` seul) a
 * l'en-tête « Portail Carrière », le lien de retour dans la page et la barre du bas (US-207) ; `nav={false}` la masque.
 * `backLabel` : texte du lien de retour d'un écran employé. `wide` : contenu plus large (tableaux de l'administration).
 */
export default function Page({
  title,
  backTo,
  backLabel = 'Retour',
  headerActions,
  actions,
  account = false,
  nav = true,
  wide = false,
  children,
}) {
  const width = wide ? 'max-w-6xl' : 'max-w-3xl'
  const employee = account === true
  const bottomBar = actions || (employee && nav)
  return (
    <div className="flex min-h-dvh flex-col">
      {employee ? (
        <EmployeeHeader />
      ) : (
        <AppHeader title={title} backTo={backTo} actions={headerActions} account={account} width={width} />
      )}
      <main className={`mx-auto flex w-full ${width} flex-1 flex-col gap-6 px-4 py-6`}>
        {employee && <h1 className="sr-only">{title}</h1>}
        {employee && backTo && (
          <Link to={backTo} className="-my-2 flex min-h-11 w-fit items-center gap-1 font-semibold text-heading hover:text-primary">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            {backLabel}
          </Link>
        )}
        {children}
      </main>
      {bottomBar && (
        <div className="sticky bottom-0 z-10">
          {actions && (
            <div className="border-t border-border bg-surface p-4 shadow-sticky">
              <div className={`mx-auto flex ${width} flex-col gap-2`}>{actions}</div>
            </div>
          )}
          {employee && nav && <BottomNav />}
        </div>
      )}
    </div>
  )
}
