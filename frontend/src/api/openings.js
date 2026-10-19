import { request, uploadToStorage } from './client.js'

/** US-802 : postes ouverts, côté espace RH. */
export function listOpenings() {
  return request('/admin/openings')
}

/** Listes de la fiche : unités du référentiel, niveaux d'études, domaines. */
export function getOpeningForm() {
  return request('/admin/openings/form')
}

export function getOpening(id) {
  return request(`/admin/openings/${encodeURIComponent(id)}`)
}

/** Saisie par un Agent RH ou un Administrateur : le poste est un brouillon. */
export function createOpening(fiche) {
  return request('/admin/openings', { method: 'POST', body: fiche })
}

export function updateOpening(id, fiche) {
  return request(`/admin/openings/${encodeURIComponent(id)}`, { method: 'PUT', body: fiche })
}

/** US-115 : combien d'employés verraient un poste avec ces critères, et ce que chaque critère écarte. */
export function previewAudience(criteria) {
  return request('/admin/openings/audience', { method: 'POST', body: criteria })
}

/** Administrateur seul : `close` ou `fill`. */
export function changeOpeningStatus(id, action) {
  return request(`/admin/openings/${encodeURIComponent(id)}/${action}`, { method: 'POST' })
}

/** US-124 : publier un brouillon ; `letter` : `{ uploadId, name }` (obligatoire pour l'Agent RH) ou rien. */
export function publishOpening(id, letter = null) {
  return request(`/admin/openings/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: { letter_upload_id: letter?.uploadId ?? null, letter_name: letter?.name ?? '' },
  })
}

/** US-124 : la lettre du directeur RH (PDF, JPG ou PNG) envoyée au stockage privé avant la publication. */
export async function sendHrLetter(file) {
  const ticket = await request('/admin/openings/letter-uploads', {
    method: 'POST',
    body: { content_type: file.type, size_bytes: file.size },
  })
  await uploadToStorage(ticket, file)
  return { uploadId: ticket.upload_id, name: file.name }
}

/** Adresse de la lettre d'un poste, ouverte dans l'espace de gestion (chaque consultation est tracée). */
export function openingLetterUrl(id) {
  return `/api/admin/openings/${encodeURIComponent(id)}/letter`
}

/** US-801 : postes publiés et ouverts auxquels l'employé connecté est apte. */
export function listMyOpenings() {
  return request('/me/openings')
}

/** US-902 : postuler à un poste publié ; l'accusé de réception est immédiat. `cv` : `{ uploadId, name }` ou rien. */
export function applyToOpening(openingId, motivation, cv = null) {
  return request(`/me/openings/${encodeURIComponent(openingId)}/apply`, {
    method: 'POST',
    body: { motivation, cv_upload_id: cv?.uploadId ?? null, cv_name: cv?.name ?? '' },
  })
}

/** US-902 : CV facultatif (PDF, JPG ou PNG) envoyé au stockage privé avant la candidature, comme un certificat. */
export async function sendCv(file) {
  const ticket = await request('/me/applications/cv-uploads', {
    method: 'POST',
    body: { content_type: file.type, size_bytes: file.size },
  })
  await uploadToStorage(ticket, file)
  return { uploadId: ticket.upload_id, name: file.name }
}

/** Adresse du CV d'une candidature, ouverte dans l'espace RH (chaque consultation est tracée). */
export function applicationCvUrl(applicationId) {
  return `/api/admin/applications/${encodeURIComponent(applicationId)}/cv`
}

/** US-902 CA-02 : « Mes candidatures », avec l'étape en cours. */
export function listMyApplications() {
  return request('/me/applications')
}

export function withdrawApplication(id) {
  return request(`/me/applications/${encodeURIComponent(id)}/withdraw`, { method: 'POST' })
}

/** US-902, espace RH : candidatures d'un poste, à faire avancer dans le circuit. */
export function listOpeningApplications(openingId) {
  return request(`/admin/openings/${encodeURIComponent(openingId)}/applications`)
}

export function moveApplication(id, step) {
  return request(`/admin/applications/${encodeURIComponent(id)}/step`, { method: 'POST', body: { step } })
}

export function closeApplication(id, outcome) {
  return request(`/admin/applications/${encodeURIComponent(id)}/close`, { method: 'POST', body: { outcome } })
}

/** US-119 : catalogue des postes ACME, toutes les fiches par ordre alphabétique. */
export function listJobProfiles() {
  return request('/admin/job-profiles')
}

/** US-119 : une fiche complète, avec les domaines de diplôme et le niveau minimum qu'elle propose. */
export function getJobProfile(code) {
  return request(`/admin/job-profiles/${encodeURIComponent(code)}`)
}
