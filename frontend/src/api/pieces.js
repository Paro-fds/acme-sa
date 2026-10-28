import { request, upload } from './client.js'

/** US-1008 : mes formations de Carrières et mes dépôts à compléter. */
export function listMyPieces() {
  return request('/me/pieces')
}

/** US-1007 : dépôt d'un scan dans Carrières ; `title` facultatif. */
export function depositPiece(file, title, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title ?? '')
  return upload('/me/pieces', form, { onProgress })
}

export function pieceFileUrl(pieceId) {
  return `/api/me/pieces/${encodeURIComponent(pieceId)}/file`
}
