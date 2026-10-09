import { Link } from 'react-router'
import logo from '../assets/logo-acme.png'
import AccountMenu from './AccountMenu.jsx'
import AppHeader from './AppHeader.jsx'
import BottomNav from './BottomNav.jsx'
import AdminLayout from '../features/admin/AdminLayout.jsx'

/** US-207 CA-02 : en-tête « Portail Carrière » de l'espace employé (écrans validés 06 → 13). */
function EmployeeHeader() {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 bg-surface/90 shadow-[0_1px_8px_rgb(0_0_0/0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-3xl items-center gap-3 px-4">
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
 * Mise en page commune :
 * - Si `account === 'admin'` : layout officiel RH (maquettes A02 à A10) avec en-tête bleu marine et barre latérale.
 * - Si `account === true` : espace employé (écrans 06 à 13) avec en-tête « Portail Carrière » et barre du bas.
 * - Sinon : en-tête simple `AppHeader`.
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
  if (account === 'admin') {
    return (
      <AdminLayout
        title={title}
        backTo={backTo}
        backLabel={backLabel}
        headerActions={headerActions}
        wide={wide}
      >
        {children}
      </AdminLayout>
    )
  }

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
