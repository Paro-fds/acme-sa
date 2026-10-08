/**
 * Mascotte « La Penseuse » (Q9) : accueil, connexion, encouragements ; jamais sur un refus.
 * Emplacement réservé (icône) tant que l'image définitive n'est pas reçue.
 */
export default function Mascot({ role, children }) {
  return (
    <figure aria-label="La Penseuse" className="flex items-start gap-4 rounded-xl bg-section p-4">
      <span
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface text-primary"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[32px]">psychology_alt</span>
      </span>
      <figcaption className="flex flex-col gap-1">
        <span className="font-semibold text-heading">
          La Penseuse{role && <span className="font-normal text-muted"> · {role}</span>}
        </span>
        <span>{children}</span>
      </figcaption>
    </figure>
  )
}
