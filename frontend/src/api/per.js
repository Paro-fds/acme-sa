import { request } from './client.js'

/** US-1012 : ma balance PER et le relevé, lus avec le code de la session (jamais un paramètre). */
export function getMyPer() {
  return request('/me/per')
}

/** US-1020 : mes bulletins de paie, du plus récent au plus ancien. */
export function getMyPayslips() {
  return request('/me/per/payslips')
}

/** US-1021 : la fiche de paie du mois (AAAA-MM) en PDF ; le code vient de la session. */
export function payslipPdfUrl(period) {
  return `/api/me/per/payslips/${encodeURIComponent(period)}.pdf`
}
