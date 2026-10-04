import { useCallback, useEffect, useRef, useState } from 'react'
import { clean, validate } from './fieldRules.js'

export const AUTOSAVE_DELAY_MS = 2000
export const NETWORK_FAILURE_MESSAGE = 'Enregistrement impossible. Vérifiez votre connexion.'

/**
 * US-10 : sauvegarde automatique du brouillon.
 *
 * - 2 s après la dernière modification, les champs **valides** qui diffèrent de ce que le serveur
 *   a enregistré sont envoyés (l'API refuse en bloc une requête contenant un champ invalide).
 * - `flush()` enregistre tout de suite (changement d'étape, bouton « Enregistrer comme brouillon »).
 * - Échec réseau : `error` contient le message ; la tentative est refaite à la modification suivante.
 *   Les autres erreurs (session expirée, mise à jour soumise…) sont transmises à `onError`.
 */
export function useAutosave({ fields, values, save, onError, initialSavedAt = null, delay = AUTOSAVE_DELAY_MS }) {
  const [savedAt, setSavedAt] = useState(initialSavedAt)
  const [error, setError] = useState(null)
  const [invalidCodes, setInvalidCodes] = useState([])
  const serverValues = useRef(Object.fromEntries(fields.map((field) => [field.code, field.value])))
  const latest = useRef({ values, save, onError })
  const timer = useRef(null)
  const queue = useRef(Promise.resolve(true))

  latest.current = { values, save, onError }

  const pending = useCallback(() => {
    const valid = {}
    const invalid = []
    for (const field of fields) {
      const value = latest.current.values[field.code] ?? ''
      if (clean(value) === clean(serverValues.current[field.code])) continue
      if (validate(field, value)) invalid.push(field.code)
      else valid[field.code] = value
    }
    return { valid, invalid }
  }, [fields])

  const send = useCallback(async () => {
    const { valid, invalid } = pending()
    setInvalidCodes(invalid)
    if (Object.keys(valid).length === 0) return true
    try {
      const result = await latest.current.save(valid)
      Object.assign(serverValues.current, valid)
      setSavedAt(result?.updated_at ?? null)
      setError(null)
      return true
    } catch (apiError) {
      if (apiError.status === 0) setError(NETWORK_FAILURE_MESSAGE)
      else latest.current.onError?.(apiError)
      return false
    }
  }, [pending])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    // Les envois sont faits l'un après l'autre, pour que le dernier état saisi gagne toujours.
    queue.current = queue.current.then(send, send)
    return queue.current
  }, [send])

  useEffect(() => {
    const { valid, invalid } = pending()
    if (Object.keys(valid).length === 0 && invalid.length === 0) return undefined
    timer.current = setTimeout(flush, delay)
    return () => clearTimeout(timer.current)
  }, [values, pending, flush, delay])

  return { savedAt, error, invalidCodes, flush }
}
