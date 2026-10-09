import { request } from './client.js'

/** US-202 : dossier saisi par l'employé (consentement, coordonnées, contact d'urgence, niveau d'études). */
export function getDossier() {
  return request('/me/dossier')
}

export function giveConsent({ information_notice, whatsapp }) {
  return request('/me/dossier/consent', { method: 'POST', body: { information_notice, whatsapp } })
}

export function saveCoordinates(values) {
  return request('/me/dossier/coordinates', { method: 'PUT', body: values })
}

export function saveContactAndEducation(values) {
  return request('/me/dossier/contact-and-education', { method: 'PUT', body: values })
}

/** US-203 : « Ces informations sont exactes » pour l'agence, le poste ou la date d'embauche. */
export function confirmHrInformation(key) {
  return request(`/me/dossier/hr-information/${key}/confirm`, { method: 'POST' })
}

/** US-203 : signaler une erreur (bonne information obligatoire, précision facultative). */
export function reportHrError(key, { correct_value, comment }) {
  return request(`/me/dossier/hr-information/${key}/report`, { method: 'POST', body: { correct_value, comment } })
}
