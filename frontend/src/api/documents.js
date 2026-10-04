import { request, upload } from './client.js'

/** Documents de l'employé connecté (E04), du plus ancien au plus récent. */
export function listMyDocuments() {
  return request('/me/documents')
}

/** US-14 : suppression d'un document (avant la soumission seulement). */
export function deleteDocument(documentId) {
  return request(`/me/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' })
}

/** US-13 : ajout d'un document ; `onProgress` reçoit l'avancement de 0 à 1. */
export function uploadDocument(file, documentType, { onProgress } = {}) {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('file', file, file.name)
  return upload('/me/documents', formData, { onProgress })
}
