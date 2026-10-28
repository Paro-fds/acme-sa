import { useState } from 'react'
import { useNavigate } from 'react-router'
import { depositPiece } from '../../api/pieces.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'
import Tip from '../../components/Tip.jsx'
import FilePicker from '../certificates/FilePicker.jsx'
import { CERTIFICATES_PATH } from '../certificates/paths.js'

const MAX_MB = 4
const NO_FILE = 'Ajoutez une photo ou le PDF de la pièce.'
const DEPOSITED = 'Pièce déposée. La DRH va la compléter, puis la valider.'

/**
 * US-1008 (dépôt d'US-1007) : la photo ou le PDF d'un diplôme, avec un intitulé facultatif. La pièce entre dans
 * Carrières « À compléter » : la DRH précise son type et la valide.
 */
export default function PieceDepositPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const sending = progress !== null

  async function handleSubmit(event) {
    event.preventDefault()
    if (sending) return
    if (!file) {
      setError({ field: 'file', message: NO_FILE })
      return
    }
    setError(null)
    setProgress(0)
    try {
      await depositPiece(file, title, setProgress)
      navigate(CERTIFICATES_PATH, { state: { notice: DEPOSITED } })
    } catch (apiError) {
      setProgress(null)
      setError({ field: apiError.field, message: apiError.message })
    }
  }

  return (
    <Page
      account
      title="Déposer une pièce"
      backTo={CERTIFICATES_PATH}
      backLabel="Mes certificats"
      actions={
        <Button type="submit" form="piece-deposit" disabled={sending}>
          <span className="material-symbols-outlined" aria-hidden="true">
            upload
          </span>
          {sending ? 'Envoi…' : 'Déposer'}
        </Button>
      }
    >
      <form id="piece-deposit" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Tip>Un diplôme, un certificat ou une attestation. La DRH précise le type de la pièce et la valide.</Tip>
        <FilePicker
          title="Pièce"
          file={file}
          onFile={(chosen) => {
            setFile(chosen)
            setError(null)
          }}
          maxMb={MAX_MB}
          error={error?.field === 'file' ? error.message : null}
          progress={progress}
        />
        <TextField
          label="Intitulé (facultatif)"
          value={title}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex. Licence en sciences comptables"
          help="Sans intitulé, le nom du fichier est repris."
        />
        {error && error.field !== 'file' && <Alert>{error.message}</Alert>}
      </form>
    </Page>
  )
}
