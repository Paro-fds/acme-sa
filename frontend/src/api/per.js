import { request, requestBlob } from './client.js'

/** US-1012 : ma balance PER et le relevé, lus avec le code de la session (jamais un paramètre). */
export function getMyPer() {
  return request('/me/per')
}

/** US-1020 : mes bulletins de paie, du plus récent au plus ancien. */
export function getMyPayslips() {
  return request('/me/per/payslips')
}

/** US-1022 : la fiche de paie du mois (AAAA-MM), au format du directeur ; le code vient de la session. */
export function payslipSheetUrl(period) {
  return `/api/me/per/payslips/${encodeURIComponent(period)}.html`
}

/** US-1024 : le relevé PER du jour `start` au jour `end` (AAAA-MM-JJ), en PDF. */
export function downloadStatementPdf(start, end) {
  const query = new URLSearchParams({ start, end })
  return requestBlob(`/me/per/statement.pdf?${query}`)
}
