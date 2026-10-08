import { request } from './client.js'

/**
 * US-102 : double authentification des comptes RH.
 * Connexion (`/admin/auth/mfa/*`, après le mot de passe) et changement depuis son compte (`/admin/me/mfa/*`).
 */

export const loginMfa = {
  status: () => request('/admin/auth/mfa'),
  start: (method, destination) => request('/admin/auth/mfa/setup', { method: 'POST', body: { method, destination } }),
  confirm: (code) => request('/admin/auth/mfa/setup/confirm', { method: 'POST', body: { code } }),
  resend: () => request('/admin/auth/mfa/code', { method: 'POST' }),
  verify: (code) => request('/admin/auth/mfa/verify', { method: 'POST', body: { code } }),
}

export const myMfa = {
  status: () => request('/admin/me/mfa'),
  sendCode: () => request('/admin/me/mfa/code', { method: 'POST' }),
  confirmCurrent: (code) => request('/admin/me/mfa/confirm', { method: 'POST', body: { code } }),
  start: (method, destination) => request('/admin/me/mfa/setup', { method: 'POST', body: { method, destination } }),
  confirm: (code) => request('/admin/me/mfa/setup/confirm', { method: 'POST', body: { code } }),
}

/** CA-05 : téléphone perdu ; la personne choisira une nouvelle méthode à sa prochaine connexion. */
export function resetAdminMfa(id) {
  return request(`/admin/admins/${encodeURIComponent(id)}/reset-mfa`, { method: 'POST' })
}
