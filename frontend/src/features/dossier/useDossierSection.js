import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getDossier } from '../../api/dossier.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import { CONSENT_PATH } from './paths.js'

/**
 * Charge le dossier d'une section du profil (US-202) et l'enregistre.
 * CA-01 : sans consentement, renvoie d'abord vers « Avant de commencer », qui ramène ensuite ici.
 * `save(send)` : appelle l'API, garde le dossier renvoyé ; une erreur de champ s'affiche près du champ (CA-02).
 */
export function useDossierSection() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const { data, error: loadError, loading } = useLoader(getDossier)
  const [dossier, setDossier] = useState(null)
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const current = dossier ?? data
  const needsConsent = current && !current.consent.information_notice_at

  useEffect(() => {
    if (needsConsent) navigate(CONSENT_PATH, { replace: true, state: { next: pathname } })
  }, [needsConsent, navigate, pathname])

  async function save(send) {
    if (sending) return null
    setSending(true)
    setSaved(false)
    setError(null)
    try {
      const result = await send()
      setDossier(result)
      setSaved(true)
      setSending(false)
      return result
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError)
      setSending(false)
      return null
    }
  }

  return {
    dossier: needsConsent ? null : current,
    loading: loading || needsConsent,
    loadError,
    save,
    sending,
    saved,
    error,
    fieldError: (field) => (error?.field === field ? error.message : null),
  }
}
