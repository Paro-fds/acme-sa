import { request, uploadToStorage } from './client.js'

/** US-301, US-303 : certificats de l'employé connecté. */
export function listCertificates() {
  return request('/me/certificates')
}

/** Listes du formulaire de dépôt : types, niveaux, domaines, limites. */
export function getCertificateForm() {
  return request('/me/certificates/form')
}

/** US-301 CA-06 : dépôt signé pour un fichier (type et taille annoncés, contrôlés par l'API). */
export function requestUpload(file) {
  return request('/me/certificates/uploads', { method: 'POST', body: { content_type: file.type, size_bytes: file.size } })
}

/** US-301 CA-06 : envoi direct du fichier au stockage privé ; `onProgress(fraction)` suit l'envoi. */
export function sendFile(ticket, file, onProgress) {
  return uploadToStorage(ticket, file, onProgress)
}

/** US-301 : enregistre le certificat une fois son fichier arrivé dans le stockage. */
export function createCertificate(fields, uploadId, originalName) {
  return request('/me/certificates', {
    method: 'POST',
    body: { ...fields, upload_id: uploadId, original_name: originalName },
  })
}

/** US-302 CA-03 : avis en un clic après le dépôt. */
export function sendFeedback(certificateId, rating) {
  return request(`/me/certificates/${certificateId}/feedback`, { method: 'POST', body: { rating } })
}
