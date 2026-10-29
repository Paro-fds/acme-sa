/** US-1024 : dates du relevé, comme `frVersIso`, `isoVersFr` et `saisirJour` du directeur. */

const pad = (value) => String(value).padStart(2, '0')

/** « 2026-01-31 » → « 31/01/2026 ». */
export function isoToFr(iso) {
  const [year, month, day] = String(iso || '').split('-')
  return year && month && day ? `${day}/${month}/${year}` : ''
}

/** « 31/01/2026 » → « 2026-01-31 » ; vide si ce n'est pas un vrai jour. */
export function frToIso(text) {
  const parts = String(text || '')
    .trim()
    .split('/')
  if (parts.length !== 3 || !parts.every((part) => /^\d+$/.test(part)) || parts[2].length !== 4) return ''
  const [day, month, year] = parts.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
  return `${parts[2]}-${pad(month)}-${pad(day)}`
}

/** Saisie au clavier numérique : les barres se placent seules (« 01082026 » → « 01/08/2026 »). */
export function typeDay(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
