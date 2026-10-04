import { request } from './client.js'

export function getStatistics() {
  return request('/admin/statistics')
}

export function listEmployees({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize })
  return request(`/admin/employees?${params}`)
}
