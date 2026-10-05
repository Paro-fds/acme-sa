import { request } from './client.js'

export function getProfile() {
  return request('/me/profile')
}

export function getMyUpdate() {
  return request('/me/update')
}

export function getEditableFields() {
  return request('/me/update/fields')
}

export function decide(accepted) {
  return request('/me/update/decision', { method: 'POST', body: { accepted } })
}

export function saveChanges(changes) {
  return request('/me/update/changes', { method: 'PUT', body: { changes } })
}

export function submitUpdate(confirmed) {
  return request('/me/update/submit', { method: 'POST', body: { confirmed } })
}

/** US-24 « Modifier à nouveau » : nouveau brouillon à partir du dernier envoi. */
export function reopenUpdate() {
  return request('/me/update/reopen', { method: 'POST' })
}

/** US-24 « Annuler les modifications » : retour au dernier envoi. */
export function discardUpdate() {
  return request('/me/update/discard', { method: 'POST' })
}
