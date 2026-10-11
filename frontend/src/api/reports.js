import { request } from './client.js'

export async function listReports({ status, origin, agency } = {}) {
  const params = new URLSearchParams()
  if (status && status !== 'Tous') params.set('status', status)
  if (origin && origin !== 'Toutes') params.set('origin', origin)
  if (agency && agency !== 'Toutes') params.set('agency', agency)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/admin/reports${qs}`)
}

export async function decideReport(reportId, { decision, comment } = {}) {
  return request(`/admin/reports/${reportId}/decide`, { method: 'POST', body: { decision, comment } })
}
