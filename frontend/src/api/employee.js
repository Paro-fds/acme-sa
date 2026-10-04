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
