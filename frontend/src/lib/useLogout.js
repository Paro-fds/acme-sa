import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { adminLogout, logout } from '../api/auth.js'

export const LOGGED_OUT_NOTICE = 'Vous êtes déconnecté.'

/** Espaces connectés : appel de déconnexion et écran de connexion où revenir. */
const SPACES = {
  employee: { close: () => logout(), loginPath: '/' },
  admin: { close: () => adminLogout(), loginPath: '/admin/connexion' },
}

/**
 * US-04 (employé), US-15 (admin) : ferme la session puis revient à l'écran de connexion.
 * L'entrée courante de l'historique est remplacée ; un retour arrière recharge l'écran
 * précédent, dont l'appel API échoue (401) et renvoie à la connexion.
 * Renvoie l'erreur si la déconnexion n'a pas pu être confirmée par le serveur.
 */
export function useLogout(space = 'employee') {
  const navigate = useNavigate()
  const { close, loginPath } = SPACES[space]
  return useCallback(async () => {
    try {
      await close()
    } catch (error) {
      // 401 : la session n'existe déjà plus, l'utilisateur est bien déconnecté.
      if (error.status !== 401) return error
    }
    navigate(loginPath, { replace: true, state: { notice: LOGGED_OUT_NOTICE } })
    return null
  }, [navigate, close, loginPath])
}
