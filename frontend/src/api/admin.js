import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function getPilotDashboard() {
  return request('/admin/dashboard')
}

/** US-108 (écran A07) : dossier V2 d'un employé (coordonnées, dates de confirmation, informations RH) et ses signalements. */
export function getEmployeeDossier(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}/dossier`)
}

export function getEmployee(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}`)
}

/** US-21 : documents d'un employé, du plus ancien au plus récent. */
export function listEmployeeDocuments(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}/documents`)
}

/** US-304 : certificats d'un employé, y compris validés et archivés (avec historique). */
export function listEmployeeCertificates(id) {
  return request(`/admin/employees/${encodeURIComponent(id)}/certificates`)
}

/** US-21 : adresse du fichier (aperçu d'image, ouverture du PDF) ; la session admin est vérifiée par l'API. */
export function employeeDocumentFileUrl(documentId) {
  return `/api/admin/documents/${encodeURIComponent(documentId)}/file`
}

/** US-304 / US-402 : adresse du fichier de certificat (téléchargement ou aperçu sécurisé). */
export function certificateFileUrl(certificateId) {
  return `/api/admin/validation/${encodeURIComponent(certificateId)}/file`
}

export function listEmployees({ page = 1, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page })
  if (search.trim()) params.set('search', search.trim())
  if (status) params.set('status', status)
  return request(`/admin/employees?${params}`)
}

/** US-602 : Recherche des employés qualifiés avec filtres (A06). */
export function searchQualifiedEmployees({
  search = '',
  agency = '',
  region = '',
  direction = '',
  folderStatus = '',
  minLevel = '',
  domain = '',
  page = 1,
  pageSize = 20,
} = {}) {
  const params = new URLSearchParams()
  if (search && search.trim()) params.set('search', search.trim())
  if (agency && agency !== 'Toutes') params.set('agency', agency)
  if (region && region !== 'Toutes') params.set('region', region)
  if (direction && direction !== 'Toutes') params.set('direction', direction)
  if (folderStatus && folderStatus !== 'Tous') params.set('folder_status', folderStatus)
  if (minLevel && minLevel !== 'Tous') params.set('min_level', minLevel)
  if (domain && domain !== 'Tous') params.set('domain', domain)
  if (page > 1) params.set('page', String(page))
  params.set('page_size', String(pageSize))
  return request(`/admin/employees/search?${params}`)
}

/** US-603 : URL d'export CSV / Excel filtré (EF-604, D-18). */
export function getEmployeesExportUrl({
  search = '',
  agency = '',
  region = '',
  direction = '',
  folderStatus = '',
  minLevel = '',
  domain = '',
  format = 'csv',
} = {}) {
  const params = new URLSearchParams()
  if (search && search.trim()) params.set('search', search.trim())
  if (agency && agency !== 'Toutes') params.set('agency', agency)
  if (region && region !== 'Toutes') params.set('region', region)
  if (direction && direction !== 'Toutes') params.set('direction', direction)
  if (folderStatus && folderStatus !== 'Tous') params.set('folder_status', folderStatus)
  if (minLevel && minLevel !== 'Tous') params.set('min_level', minLevel)
  if (domain && domain !== 'Tous') params.set('domain', domain)
  if (format) params.set('format', format)
  return `/api/admin/employees/export?${params}`
}

/** US-1003 (anciennement US-22) : débloque l'accès de l'employé et ferme ses sessions. */
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

/** US-23 & US-104 : ajout avec un mot de passe provisoire, nom, email, matricule rattaché et rôle. */
export function addAdmin(payloadOrUsername, maybePassword, maybeRole = 'AGENT_RH') {
  let body
  if (typeof payloadOrUsername === 'object' && payloadOrUsername !== null) {
    const { username, password, role = 'AGENT_RH', fullName, email, employeeId } = payloadOrUsername
    body = {
      username,
      password,
      role,
      full_name: fullName,
      email,
      employee_id: employeeId,
    }
  } else {
    body = { username: payloadOrUsername, password: maybePassword, role: maybeRole }
  }
  return request('/admin/admins', { method: 'POST', body })
}

/** US-104 CA-02 : désactiver ou activer un compte RH. */
export function setAdminStatus(id, isActive) {
  return request(`/admin/admins/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: { is_active: isActive },
  })
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

/** US-604 : Journal d'audit des actions RH (EF-605, ENF-08). */
export function getAuditLog({ actor = '', target = '', action = '', period = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize })
  if (actor && actor !== 'Toutes' && actor !== 'Tous') params.set('actor', actor)
  if (target && target !== 'Tous') params.set('target', target)
  if (action && action !== 'Tous') params.set('action', action)
  if (period && period !== 'Tous' && period !== 'Toutes') params.set('period', period)
  return request(`/admin/audit?${params}`)
}
