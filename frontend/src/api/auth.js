import { request } from './client.js'

/** US-1003 : étape 1, code employé et date de naissance (AAAA-MM-JJ) ; renvoie les canaux proposés. */
/** US-1015 : `captcha`, la réponse au calcul demandé à partir de 3 échecs. */
export function identify(employeeCode, birthDate, captcha) {
  const body = { employee_code: employeeCode, birth_date: birthDate }
  if (captcha) body.captcha = captcha
  return request('/auth/identify', { method: 'POST', body })
}

/** US-1003 : étape 2, envoi (ou renvoi) du code ; en local, la réponse contient `local_code`. */
export function sendLoginCode(channel = 'EMAIL') {
  return request('/auth/code', { method: 'POST', body: { channel } })
}

/** US-1003 : étape 3, le code reçu ; la session employé s'ouvre. */
export function verifyLoginCode(code) {
  return request('/auth/verify', { method: 'POST', body: { code } })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export function adminLogin(username, password) {
  return request('/admin/auth/login', { method: 'POST', body: { username, password } })
}

export function adminLogout() {
  return request('/admin/auth/logout', { method: 'POST' })
}
