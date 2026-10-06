import { formatMonth } from '../../lib/format.js'

/**
 * Présentation des rubriques du parcours (V2, US-25). Les libellés et les champs viennent de l'API
 * (registre `entry_kinds.py`) ; ici : icône, adresse d'ajout et message d'accueil d'une rubrique vide.
 */
export const CAREER_KINDS = {
  QUALIFICATION: {
    slug: 'diplomes',
    icon: 'school',
    empty: 'Ajoutez vos diplômes et certifications pour les faire connaître à ACME SA.',
  },
  TRAINING: {
    slug: 'formations',
    icon: 'model_training',
    empty: 'Ajoutez les formations que vous avez suivies, internes ou externes.',
  },
  EXPERIENCE: {
    slug: 'experiences',
    icon: 'work_history',
    empty: 'Ajoutez les postes que vous avez occupés, chez ACME ou ailleurs.',
  },
  SKILL: {
    slug: 'competences',
    icon: 'psychology',
    empty: 'Ajoutez vos compétences pour que l’administration vous trouve quand un poste les demande.',
  },
}

const join = (...parts) => parts.filter(Boolean).join(' · ')

/** Période d'une formation ou d'une expérience : « mars 2025 → avril 2025 » ou « depuis mars 2025 · en cours ». */
function period(entry, openLabel) {
  if (!entry.end_month) return join(`depuis ${formatMonth(entry.start_month)}`, openLabel)
  return `${formatMonth(entry.start_month)} → ${formatMonth(entry.end_month)}`
}

/** Lignes de détail d'un élément, sous son intitulé. */
export function describeEntry(entry) {
  switch (entry.kind) {
    case 'QUALIFICATION':
      return [
        join(entry.qualification_type_label, entry.organization, formatMonth(entry.start_month)),
        entry.end_month ? `expire en ${formatMonth(entry.end_month)}` : null,
      ].filter(Boolean)
    case 'TRAINING':
      return [join(entry.organization, period(entry, 'en cours'), entry.duration_hours ? `${entry.duration_hours} h` : null)]
    case 'EXPERIENCE':
      return [
        join([entry.organization, entry.location].filter(Boolean).join(', '), period(entry, 'poste actuel')),
        entry.description,
      ].filter(Boolean)
    default:
      return []
  }
}
