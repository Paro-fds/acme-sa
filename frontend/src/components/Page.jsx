import AppHeader from './AppHeader.jsx'
import EmployeeLayout from './EmployeeLayout.jsx'
import AdminLayout from '../features/admin/AdminLayout.jsx'
import { useIdleLogout } from '../lib/useIdleLogout.js'

/** US-125 : déconnexion après 15 minutes sans activité, dans les deux espaces connectés. */
function IdleLogout({ space }) {
  useIdleLogout(space)
  return null
}

/**
 * Mise en page commune :
 * - Si `account === 'admin'` : cadre de l'espace RH (US-108, écrans A02 → A11) : en-tête bleu marine, menu latéral, titre et `subtitle`.
 * - Si `account === true` : espace employé (`EmployeeLayout`, US-113) : téléphone (écrans 06 à 13, barre du bas, bouton ☰),
 *   ordinateur (menu à gauche, `aside` dans la colonne de droite).
 * - Sinon : en-tête simple `AppHeader`.
 */
export default function Page({
  title,
  subtitle,
  backTo,
  backLabel = 'Retour',
  headerActions,
  actions,
  account = false,
  nav = true,
  wide = false,
  aside,
  asideLabel,
  children,
}) {
  if (account === 'admin') {
    return (
      <>
        <IdleLogout space="admin" />
        <AdminLayout
          title={title}
          subtitle={subtitle}
          backTo={backTo}
          backLabel={backLabel}
          headerActions={headerActions}
          wide={wide}
        >
          {children}
        </AdminLayout>
      </>
    )
  }

  if (account === true) {
    return (
      <>
        <IdleLogout space="employee" />
        <EmployeeLayout title={title} backTo={backTo} backLabel={backLabel} actions={actions} nav={nav} aside={aside} asideLabel={asideLabel} wide={wide}>
          {children}
        </EmployeeLayout>
      </>
    )
  }

  const width = wide ? 'max-w-6xl' : 'max-w-3xl'
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader title={title} backTo={backTo} actions={headerActions} account={account} width={width} />
      <main className={`mx-auto flex w-full ${width} flex-1 flex-col gap-6 px-4 py-6`}>{children}</main>
      {actions && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-surface p-4 shadow-sticky">
          <div className={`mx-auto flex ${width} flex-col gap-2`}>{actions}</div>
        </div>
      )}
    </div>
  )
}
