import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { logout } from '../api/auth.js'

export const LOGGED_OUT_NOTICE = 'Vous êtes déconnecté.'

/**
 * US-04 : ferme la session puis revient à l'identification.
 * L'entrée courante de l'historique est remplacée ; un retour arrière recharge l'écran
 * précédent, dont l'appel API échoue (401) et renvoie à l'identification.
 * Renvoie l'erreur si la déconnexion n'a pas pu être confirmée par le serveur.
 */
export function useLogout(loginPath = '/') {
  const navigate = useNavigate()
  return useCallback(async () => {
    try {
      await logout()
    } catch (error) {
      // 401 : la session n'existe déjà plus, l'employé est bien déconnecté.
      if (error.status !== 401) return error
    }
    navigate(loginPath, { replace: true, state: { notice: LOGGED_OUT_NOTICE } })
    return null
  }, [navigate, loginPath])
}
