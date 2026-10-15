/**
 * US-113 : conseil de la page (remplace la mascotte « La Penseuse », retirée comme sur l'accueil et la connexion).
 * Sur ordinateur, il va dans la colonne de droite ; sur téléphone, il reste à sa place dans la page.
 */
export default function Tip({ title, icon = 'lightbulb', children }) {
  return (
    <aside className="flex items-start gap-3 rounded-xl bg-section p-4 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-highlight text-primary" aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {title && <p className="font-semibold text-heading">{title}</p>}
        <div className="leading-relaxed text-help">{children}</div>
      </div>
    </aside>
  )
}
