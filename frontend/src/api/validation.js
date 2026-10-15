import { request } from './client.js'

export async function getValidationQueue(params = {}) {
  const query = new URLSearchParams()
  if (params.agency && params.agency !== 'Toutes') query.set('agency', params.agency)
  if (params.level && params.level !== 'Tous') query.set('level', params.level)
  if (params.certificate_type && !params.certificate_type.startsWith('Tous')) {
    query.set('certificate_type', params.certificate_type)
  }
  if (params.overdue_only) query.set('overdue_only', 'true')
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/validation/queue${qs}`)
}

export async function claimNextCertificate() {
  return request('/admin/validation/claim-next', { method: 'POST', body: {} })
}

export async function getCertificateReview(certificateId) {
  return request(`/admin/validation/${certificateId}`)
}

export async function correctCertificateFields(certificateId, fields) {
  return request(`/admin/validation/${certificateId}/fields`, { method: 'PATCH', body: fields })
}

export async function assignCertificate(certificateId, targetAdmin) {
  return request(`/admin/validation/${certificateId}/assign`, { method: 'POST', body: { target_admin: targetAdmin } })
}

export async function decideCertificate(certificateId, { decision, reason, comment }) {
  return request(`/admin/validation/${certificateId}/decide`, {
    method: 'POST',
    body: { decision, reason, comment },
  })
}

export function getCertificateFileUrl(certificateId) {
  return `/api/admin/validation/${certificateId}/file`
}
