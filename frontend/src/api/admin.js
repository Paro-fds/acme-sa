import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function listEmployees({ page = 1, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page })
  if (search.trim()) params.set('search', search.trim())
  if (status) params.set('status', status)
  return request(`/admin/employees?${params}`)
}
