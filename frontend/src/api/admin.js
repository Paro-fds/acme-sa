import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function listEmployees({ page = 1 } = {}) {
  const params = new URLSearchParams({ page })
  return request(`/admin/employees?${params}`)
}
