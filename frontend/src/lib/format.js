const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** "1996-03-15" → "15/03/1996" (date sans heure : pas de conversion de fuseau). */
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

/** Horodatage ISO → "04/10/2026 à 14:32" (heure locale du téléphone). */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return ''
  const value = new Date(isoDateTime)
  return `${dateFormatter.format(value)} à ${timeFormatter.format(value)}`
}

export function displayValue(value) {
  return value ? value : 'Non renseigné'
}

const GENDERS = { M: 'Masculin', F: 'Féminin' }

/** Code du CSV ("M" / "F") → libellé ; une autre valeur est affichée telle quelle. */
export function formatGender(code) {
  return GENDERS[code?.toUpperCase()] ?? code
}

/** "JOSEPH", "Jean" → "JJ" (avatar sans photo). */
export function initials(lastName, firstName) {
  return `${lastName?.[0] ?? ''}${firstName?.[0] ?? ''}`.toUpperCase()
}
