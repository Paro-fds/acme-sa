/**
 * Client HTTP unique : les composants n'appellent jamais fetch directement
 * (docs/03-plan-implementation.md §1.1).
 *
 * Les erreurs de l'API ont le format {"error": {"code", "message"}} ;
 * elles sont levées sous forme d'ApiError, avec un message affichable tel quel.
 */

export class ApiError extends Error {
  constructor(status, code, message, field = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

const NETWORK_ERROR_MESSAGE = 'Le serveur est injoignable. Vérifiez votre connexion.'

function toApiError(status, data) {
  const error = data?.error ?? {}
  return new ApiError(
    status,
    error.code ?? 'UNKNOWN_ERROR',
    error.message ?? 'Une erreur est survenue.',
    error.field ?? null,
  )
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
