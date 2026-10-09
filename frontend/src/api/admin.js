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

/** US-23 : compte de la session admin ({ id, username, must_change_password }). */
export function getAdminMe() {
  return request('/admin/me')
}

/** US-23 : nouveau mot de passe (le provisoire, ou l'actuel) ; la session est renouvelée. */
export function changeMyAdminPassword(currentPassword, newPassword, newPasswordConfirmation) {
  return request('/admin/me/password', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
  })
}

/** US-23 : comptes administrateurs, du plus ancien au plus récent. */
export function listAdmins() {
  return request('/admin/admins')
}

/** US-23 : ajout avec un mot de passe provisoire ; US-103 : rôle initial. */
export function addAdmin(username, password, role = 'AGENT_RH') {
  return request('/admin/admins', { method: 'POST', body: { username, password, role } })
}

export function deleteAdmin(id) {
  return request(`/admin/admins/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** US-103 : rôles disponibles pour les comptes RH. */
export function listAdminRoles() {
  return request('/admin/roles')
}

/** US-103 : changer le rôle d'un compte RH. */
export function changeAdminRole(id, role) {
  return request(`/admin/admins/${encodeURIComponent(id)}/role`, {
    method: 'PUT',
    body: { role },
  })
}

/** US-103 CA-03 : historique des modifications de rôle d'un compte. */
export function getAdminRoleHistory(id) {
  return request(`/admin/admins/${encodeURIComponent(id)}/role-history`)
}

/** US-605 : connexions des 30 derniers jours et avis après le dépôt. */
export function getEngagement() {
  return request('/admin/engagement')
}
