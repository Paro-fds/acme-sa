import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function listEmployees({ page = 1, search = '' } = {}) {
  const params = new URLSearchParams({ page })
  if (search.trim()) params.set('search', search.trim())
  return request(`/admin/employees?${params}`)
}
