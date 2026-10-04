import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

/**
 * Charge des données au montage de l'écran ; `reload()` relance le chargement.
 * Une réponse 401 (pas de session ou session expirée) renvoie vers l'écran de connexion.
 */
export function useLoader(load, { loginPath = '/' } = {}) {
  const navigate = useNavigate()
  const loadRef = useRef(load)
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const run = useCallback(() => {
    let active = true
    loadRef
      .current()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          navigate(loginPath, { replace: true, state: { message: error.message } })
          return
        }
        setState({ data: null, error, loading: false })
      })
    return () => {
      active = false
    }
  }, [navigate, loginPath])

  useEffect(run, [run])

  return { ...state, reload: run }
}

/** Pour les actions (envoi de formulaire) : 401 → retour à la connexion, sinon renvoie l'erreur. */
export function useUnauthorizedRedirect(loginPath = '/') {
  const navigate = useNavigate()
  return useCallback(
    (error) => {
      if (error?.status === 401) {
        navigate(loginPath, { replace: true, state: { message: error.message } })
        return true
      }
      return false
    },
    [navigate, loginPath],
  )
}
