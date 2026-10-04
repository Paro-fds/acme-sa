/**
 * Client HTTP unique : les composants n'appellent jamais fetch directement
 * (docs/03-plan-implementation.md §1.1).
 *
 * Les erreurs de l'API ont le format {"error": {"code", "message"}} ;
 * elles sont levées sous forme d'ApiError, avec un message affichable tel quel.
 */

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const NETWORK_ERROR_MESSAGE = 'Le serveur est injoignable. Vérifiez votre connexion.'

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

  if (!response.ok) {
    const error = data?.error ?? {}
    throw new ApiError(response.status, error.code ?? 'UNKNOWN_ERROR', error.message ?? 'Une erreur est survenue.')
  }
  return data
}
