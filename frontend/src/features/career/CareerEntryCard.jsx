import { describeEntry } from './careerKinds.js'

/**
 * Un élément du parcours (diplôme, formation, expérience). Réutilisé en lecture seule
 * dans le dossier admin (US-30). Les compétences s'affichent en étiquettes (`SkillTag`).
 */
export default function CareerEntryCard({ entry }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <h4 className="font-semibold text-heading">{entry.title}</h4>
      {describeEntry(entry).map((line) => (
        <p key={line} className="text-sm whitespace-pre-line text-help">{line}</p>
      ))}
    </li>
  )
}

/** Compétence et son niveau (US-31). */
export function SkillTag({ entry }) {
  return (
    <li className="flex min-h-11 items-center gap-2 rounded-full border border-info-border bg-info-bg py-1 pr-1 pl-4">
      <span className="font-semibold text-heading">{entry.title}</span>
      <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold text-info-text">{entry.skill_level_label}</span>
    </li>
  )
}
