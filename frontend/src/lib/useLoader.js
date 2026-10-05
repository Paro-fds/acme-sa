import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'
export const ADMIN_PASSWORD_PATH = '/admin/mot-de-passe'

/**
 * Charge des données au montage de l'écran ; `reload()` relance le chargement.
 * `key` : quand il change (page, recherche, filtre…), le chargement est relancé avec la dernière
 * fonction `load` ; les données précédentes restent affichées jusqu'à l'arrivée des nouvelles.
 * Une réponse 401 (pas de session ou session expirée) renvoie vers l'écran de connexion ;
 * `403 PASSWORD_CHANGE_REQUIRED` (mot de passe admin provisoire, US-23) vers son changement.
 */
export function useLoader(load, { loginPath = '/', key } = {}) {
  const navigate = useNavigate()
  const loadRef = useRef(load)
  const [state, setState] = useState({ data: null, error: null, loading: true })

  // Déclaré avant l'effet de chargement : la fonction la plus récente est utilisée.
  useEffect(() => {
    loadRef.current = load
  })

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
        if (error.code === PASSWORD_CHANGE_REQUIRED) {
          navigate(ADMIN_PASSWORD_PATH, { replace: true })
          return
        }
        setState({ data: null, error, loading: false })
      })
    return () => {
      active = false
    }
  }, [navigate, loginPath])

  useEffect(run, [run, key])

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
