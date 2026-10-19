/**
 * Client HTTP unique : les composants n'appellent jamais fetch directement
 * (docs/02-solution-design.md §3).
 *
 * Les erreurs de l'API ont le format {"error": {"code", "message"}} ;
 * elles sont levées sous forme d'ApiError, avec un message affichable tel quel.
 */

export class ApiError extends Error {
  /** `details` : informations complémentaires de l'erreur (par exemple `retry_after`, US-101). */
  constructor(status, code, message, field = null, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
    this.details = details
  }
}

const NETWORK_ERROR_MESSAGE = 'Le serveur est injoignable. Vérifiez votre connexion.'

function toApiError(status, data) {
  const { code, message, field, ...details } = data?.error ?? {}
  return new ApiError(status, code ?? 'UNKNOWN_ERROR', message ?? 'Une erreur est survenue.', field ?? null, details)
}

export async function request(path, { method = 'GET', body, headers } = {}) {
  const isFormData = body instanceof FormData
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: isFormData || body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: isFormData || body === undefined ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)

  if (!response.ok) throw toApiError(response.status, data)
  return data
}

/**
 * Envoi d'un formulaire multipart avec suivi de progression (`onProgress(0..1)`).
 * XMLHttpRequest plutôt que fetch : seul moyen de connaître l'avancement d'un envoi.
 */
export function upload(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api${path}`)
    xhr.withCredentials = true
    xhr.responseType = 'json'
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else reject(toApiError(xhr.status, xhr.response))
    }
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE))
    xhr.send(formData)
  })
}

const UPLOAD_FAILED_MESSAGE = "L'envoi du fichier n'a pas abouti. Vérifiez votre connexion et réessayez."

/**
 * US-301 CA-06 : envoie un fichier avec un dépôt signé, directement dans le stockage privé.
 * `ticket` : `{ method: 'POST', url, fields }` (formulaire signé S3) ou `{ method: 'PUT', url, headers }`.
 * Une adresse qui commence par `/api` est celle du stockage local du poste du développeur.
 */
export function uploadToStorage(ticket, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(ticket.method, ticket.url)
    xhr.withCredentials = ticket.url.startsWith('/api')
    for (const [name, value] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new ApiError(xhr.status, 'UPLOAD_FAILED', UPLOAD_FAILED_MESSAGE))
    }
    xhr.onerror = () => reject(new ApiError(0, 'UPLOAD_FAILED', UPLOAD_FAILED_MESSAGE))
    if (ticket.method === 'POST') {
      const form = new FormData()
      for (const [name, value] of Object.entries(ticket.fields ?? {})) form.append(name, value)
      form.append('file', file)
      xhr.send(form)
    } else {
      xhr.send(file)
    }
  })
}
