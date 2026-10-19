import { request } from './client.js'

/**
 * US-125 : déconnexion après une période sans activité. Module à part de `auth.js` : les écrans connectés l'utilisent
 * tous (par `Page`), sans dépendre des appels de connexion que leurs tests simulent.
 */

/** Durées d'inactivité (minutes) après lesquelles l'écran ramène à la connexion. */
export function getSessionOptions() {
  return request('/auth/session-options')
}

/** Signale une activité (clic, saisie, défilement) ; la session repart pour sa durée. */
export function keepAlive(space) {
  return request(space === 'admin' ? '/admin/auth/keep-alive' : '/auth/keep-alive', { method: 'POST' })
}

/** Ferme la session de l'espace (`employee` ou `admin`). */
export function endSession(space) {
  return request(space === 'admin' ? '/admin/auth/logout' : '/auth/logout', { method: 'POST' })
}
