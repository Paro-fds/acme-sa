import { request } from './client.js'

/** US-116 : notifications du compte RH connecté, les plus récentes d'abord, avec le nombre de non lues. */
export function getNotifications({ kind = null, limit = 50 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (kind) params.set('kind', kind)
  return request(`/admin/notifications?${params}`)
}

/** Une notification ouverte devient lue pour ce compte seulement. */
export function markNotificationRead(key) {
  return request(`/admin/notifications/${encodeURIComponent(key)}/read`, { method: 'POST' })
}

export function markAllNotificationsRead() {
  return request('/admin/notifications/read-all', { method: 'POST' })
}
