import { request } from './client.js'

export function identify(identity) {
  return request('/auth/identify', { method: 'POST', body: identity })
}

export function register(identity, password, passwordConfirmation) {
  return request('/auth/register', {
    method: 'POST',
    body: { ...identity, password, password_confirmation: passwordConfirmation },
  })
}

export function login(identity, password) {
  return request('/auth/login', { method: 'POST', body: { ...identity, password } })
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
