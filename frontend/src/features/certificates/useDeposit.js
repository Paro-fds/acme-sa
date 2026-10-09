import { useRef, useState } from 'react'
import { createCertificate, requestUpload, sendFile } from '../../api/certificates.js'
import { useUnauthorizedRedirect } from '../../lib/useLoader.js'

export const NO_FILE_MESSAGE = 'Ajoutez une photo ou un PDF de votre certificat.'

/**
 * US-301 : dépôt signé, envoi direct du fichier au stockage privé, puis enregistrement du certificat.
 * Un fichier déjà arrivé n'est pas renvoyé quand l'employé corrige un champ (CA-03) ; il l'est s'il en choisit un autre.
 */
export function useDeposit() {
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const uploaded = useRef(null)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  async function deposit(file, fields) {
    if (sending) return null
    if (!file) {
      setError({ field: 'file', message: NO_FILE_MESSAGE })
      return null
    }
    setSending(true)
    setError(null)
    try {
      if (uploaded.current?.file !== file) {
        const ticket = await requestUpload(file)
        setProgress(0)
        await sendFile(ticket, file, setProgress)
        uploaded.current = { file, uploadId: ticket.upload_id }
      }
      const certificate = await createCertificate(fields, uploaded.current.uploadId, file.name)
      setSending(false)
      return certificate
    } catch (apiError) {
      // Fichier refusé à la vérification : il a été supprimé, le prochain envoi repart de zéro.
      if (apiError.field === 'file') uploaded.current = null
      if (!redirectIfUnauthorized(apiError)) setError(apiError)
      setSending(false)
      setProgress(null)
      return null
    }
  }

  return {
    deposit,
    sending,
    progress,
    error,
    fieldError: (field) => (error?.field === field ? error.message : null),
  }
}
