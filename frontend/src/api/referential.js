import { request, upload } from './client.js'

/** US-501 : référentiel des unités (agences, régions, directions, services) et correspondances avec l'export. */
export function getReferential() {
  return request('/admin/referential')
}

/** US-501 CA-01 : import du classeur Excel ; un fichier incohérent est refusé avec la liste des problèmes. */
export function importReferential(file) {
  const formData = new FormData()
  formData.append('file', file)
  return upload('/admin/referential/import', formData)
}
