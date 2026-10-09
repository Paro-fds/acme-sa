/**
 * Mascotte « La Penseuse » (Q9) : accueil, connexion, encouragements ; jamais sur un refus.
 * Présentation des écrans validés (`code.html` 05, 07 → 10) : médaillon de 48 px avec la pastille rouge de la charte,
 * le nom en bleu, le rôle, puis le conseil. Emplacement réservé (icône) tant que l'image définitive n'est pas reçue.
 */
export default function Mascot({ role, children }) {
  return (
    <figure aria-label="La Penseuse" className="flex items-start gap-3 rounded-xl bg-section p-4 shadow-card">
      <span className="relative shrink-0" aria-hidden="true">
        <span className="flex size-12 items-center justify-center rounded-full bg-highlight text-primary">
          <span className="material-symbols-outlined text-2xl">psychology_alt</span>
        </span>
        <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-brand-red ring-2 ring-section" />
      </span>
      <figcaption className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-bold text-primary">
          La Penseuse{role && <span className="font-normal text-help"> · {role}</span>}
        </span>
        <span className="leading-relaxed">{children}</span>
      </figcaption>
    </figure>
  )
}
