import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function getEmployee(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}`)
}

/** US-21 : documents d'un employé, du plus ancien au plus récent. */
export function listEmployeeDocuments(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}/documents`)
}

/** US-21 : adresse du fichier (aperçu d'image, ouverture du PDF) ; la session admin est vérifiée par l'API. */
export function employeeDocumentFileUrl(documentId) {
  return `/api/admin/documents/${encodeURIComponent(documentId)}/file`
}

export function listEmployees({ page = 1, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page })
  if (search.trim()) params.set('search', search.trim())
  if (status) params.set('status', status)
  return request(`/admin/employees?${params}`)
}

/** US-22 : efface le mot de passe de l'employé et ferme ses sessions (seule écriture de l'administration). */
export function resetAccess(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}/reset-access`, { method: 'POST' })
}
