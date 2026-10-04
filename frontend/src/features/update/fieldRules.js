/**
 * Validation à la saisie des champs modifiables (US-09).
 * Reprend les règles du registre serveur (backend/app/update/domain/editable_fields.py),
 * qui reste la référence : le serveur valide de nouveau chaque envoi.
 */

export const REQUIRED_MESSAGE = 'Ce champ est obligatoire.'

const NAME = /^\p{L}+(?:[ '-]\p{L}+)*$/u
const PHONE = /^\+?\d{8,15}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const NAME_RULE = {
  isValid: (value) => value.length <= 60 && NAME.test(value),
  message: 'Saisissez un nom valide (lettres, espaces, tirets).',
}

const RULES = {
  last_name: NAME_RULE,
  first_name: NAME_RULE,
  telephone_number: {
    isValid: (value) => PHONE.test(value.replace(/[\s-]/g, '')),
    message: 'Saisissez un numéro valide, par exemple +509 3722 1111.',
  },
  email_address: {
    isValid: (value) => value.length <= 254 && EMAIL.test(value),
    message: 'Saisissez une adresse email valide.',
  },
  address_line_1: {
    isValid: (value) => value.length >= 5 && value.length <= 200,
    message: "L'adresse doit contenir entre 5 et 200 caractères.",
  },
}

/** Même nettoyage que le serveur : espaces superflus retirés. */
export function clean(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/** Message d'erreur du champ, ou null si la valeur est acceptable. */
export function validate(field, rawValue) {
  const value = clean(rawValue)
  if (!value) return field.required ? REQUIRED_MESSAGE : null
  const rule = RULES[field.code]
  return rule && !rule.isValid(value) ? rule.message : null
}

/** Un champ est modifié si sa valeur nettoyée diffère de la valeur d'origine. */
export function isModified(field, rawValue) {
  return clean(rawValue) !== clean(field.original_value)
}
