import AppHeader from './AppHeader.jsx'

/**
 * Mise en page commune : en-tête, contenu centré, barre d'action collée en bas sur mobile.
 * `wide` : contenu plus large sur grand écran (tableaux de l'administration).
 */
export default function Page({ title, backTo, headerActions, actions, account = false, wide = false, children }) {
  const width = wide ? 'max-w-6xl' : 'max-w-3xl'
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader title={title} backTo={backTo} actions={headerActions} account={account} width={width} />
      <main className={`mx-auto flex w-full ${width} flex-1 flex-col gap-6 px-4 py-6`}>{children}</main>
      {actions && (
        <div className="sticky bottom-0 border-t border-border bg-surface p-4 shadow-sticky">
          <div className={`mx-auto flex ${width} flex-col gap-2`}>{actions}</div>
        </div>
      )}
    </div>
  )
}
