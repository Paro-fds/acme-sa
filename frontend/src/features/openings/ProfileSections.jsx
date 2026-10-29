/**
 * US-119 : rubriques d'une fiche du catalogue des postes ACME (Missions, Qualifications, Expérience, Conditions
 * d'exercice, Qualités attendues), chacune repliée et ouverte d'un geste. `open` : toutes dépliées (aperçu RH).
 */
export default function ProfileSections({ sections, open = false }) {
  if (!sections?.length) return null
  return (
    <div className="flex flex-col border-t border-border">
      {sections.map((section) => (
        <details key={section.title} open={open} className="group border-b border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-base font-semibold text-heading [&::-webkit-details-marker]:hidden">
            {section.title}
            <span className="material-symbols-outlined text-help transition-transform group-open:rotate-180" aria-hidden="true">
              keyboard_arrow_down
            </span>
          </summary>
          <ul className="flex list-disc flex-col gap-1 pb-3 pl-5 text-base text-body">
            {section.lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
