import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { endSession, getSessionOptions, keepAlive } from '../api/session.js'
import { EMPLOYEE_LOGIN_PATH } from './paths.js'

/** Partagée entre les onglets de l'application ouverts dans le même navigateur (CA-03). */
export const LAST_ACTIVITY_KEY = 'acme-last-activity'
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart']
const CHECK_MS = 15_000
const KEEP_ALIVE_MS = 60_000
const DEFAULT_MINUTES = 15

const SPACES = {
  employee: { loginPath: EMPLOYEE_LOGIN_PATH, option: 'employee_idle_minutes' },
  admin: { loginPath: '/admin/connexion', option: 'admin_idle_minutes' },
}

export const idleNotice = (minutes) =>
  `Vous avez été déconnecté après ${minutes} minutes sans activité. Reconnectez-vous.`

let options = null

/** Durées réglées sur le serveur, lues une fois ; sans réponse, 15 minutes. */
function idleMinutes(option) {
  options ??= getSessionOptions().catch(() => {
    options = null
    return null
  })
  return options.then((values) => values?.[option] ?? DEFAULT_MINUTES)
}

function readShared() {
  try {
    return Number(window.localStorage.getItem(LAST_ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeShared(at) {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
  } catch {
    // Stockage du navigateur indisponible : l'onglet compte seulement sa propre activité.
  }
}

/**
 * US-125 : après N minutes sans clic, saisie ni défilement (dans aucun onglet), ferme la session et revient à la
 * connexion de l'espace (`space` : `employee` ou `admin`). Une activité sans enregistrement est signalée au serveur
 * au plus une fois par minute ; sans activité, rien n'est envoyé (CA-05).
 */
export function useIdleLogout(space) {
  const navigate = useNavigate()

  useEffect(() => {
    const { loginPath, option } = SPACES[space]
    let lastActivity = Date.now()
    let lastPing = lastActivity
    let limitMs = null
    let done = false
    writeShared(lastActivity)

    function onActivity() {
      const now = Date.now()
      if (now - lastActivity < 1000) return
      lastActivity = now
      writeShared(now)
    }

    function leave(state) {
      done = true
      navigate(loginPath, { replace: true, state })
    }

    async function check() {
      if (done) return
      limitMs ??= (await idleMinutes(option)) * 60_000
      if (done) return
      const now = Date.now()
      const last = Math.max(lastActivity, readShared())
      if (now - last >= limitMs) {
        done = true
        try {
          await endSession(space)
        } catch {
          // 401 : la session est déjà fermée côté serveur.
        }
        leave({ notice: idleNotice(limitMs / 60_000) })
        return
      }
      if (last > lastPing && now - lastPing >= KEEP_ALIVE_MS) {
        lastPing = now
        keepAlive(space).catch((error) => {
          if (error?.status === 401 && !done) leave({ message: error.message })
        })
      }
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { capture: true, passive: true }))
    const timer = setInterval(check, CHECK_MS)
    return () => {
      done = true
      clearInterval(timer)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity, { capture: true }))
    }
  }, [space, navigate])
}

/** Pour les tests : oublie les durées lues sur le serveur. */
export function resetIdleOptions() {
  options = null
}
