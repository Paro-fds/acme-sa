import AppHeader from './AppHeader.jsx'

/** Mise en page commune : en-tête, contenu centré, barre d'action collée en bas sur mobile. */
export default function Page({ title, backTo, headerActions, actions, account = false, children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader title={title} backTo={backTo} actions={headerActions} account={account} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
      {actions && (
        <div className="sticky bottom-0 border-t border-border bg-surface p-4 shadow-sticky">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">{actions}</div>
        </div>
      )}
    </div>
  )
}
