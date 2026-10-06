import { request } from './client.js'

/** US-25 : parcours de l'employé connecté — quatre rubriques triées, avec `count` et `limit`. */
export function getMyCareer() {
  return request('/me/career')
}

/** US-25 : registre des rubriques (champs, libellés, règles) pour générer les formulaires. */
export function getCareerFields() {
  return request('/me/career/fields')
}
