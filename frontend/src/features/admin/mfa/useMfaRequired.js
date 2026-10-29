import { useEffect, useState } from 'react'
import { getMfaOptions } from '../../../api/mfa.js'

/**
 * US-112 : la double authentification de l'espace de gestion est-elle demandée (réglage ADMIN_MFA_REQUIRED) ?
 * `null` tant que la réponse n'est pas arrivée ; sans réponse, on la considère coupée (aucune étape annoncée).
 */
export function useMfaRequired() {
  const [required, setRequired] = useState(null)
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => getMfaOptions())
      .then((options) => active && setRequired(Boolean(options?.mfa_required)))
      .catch(() => active && setRequired(false))
    return () => {
      active = false
    }
  }, [])
  return required
}
