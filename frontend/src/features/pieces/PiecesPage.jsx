import { Link, useLocation } from 'react-router'
import { getProfile } from '../../api/employee.js'
import { listMyPieces, pieceFileUrl } from '../../api/pieces.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { formatDate, formatLocalDate } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import { Checklist } from '../certificates/CertificatesPage.jsx'
import { DEPOSIT_PATH } from '../certificates/paths.js'

async function load() {
  const [profile, pieces] = await Promise.all([getProfile(), listMyPieces()])
  return { completion: profile.completion, pieces }
}

const TONES = {
  a_completer: 'neutral',
  en_attente: 'progress',
  valide: 'done',
  refuse: 'error',
}

const DEPOSIT_LINK =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active'

function PieceCard({ piece }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold break-words text-heading">{piece.title}</span>
          <span className="text-sm text-help">{piece.type_label ?? 'Type à préciser par la DRH'}</span>
        </span>
        <StatusBadge tone={TONES[piece.status] ?? 'neutral'}>{piece.status_label}</StatusBadge>
      </div>
      {piece.status === 'refuse' && piece.refusal_reason && (
        <p className="text-sm text-error-text">Motif : {piece.refusal_reason}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-help">
        <span>
          {piece.status === 'a_completer'
            ? `Déposée le ${formatLocalDate(piece.deposited_at)}`
            : `Pièce du ${formatDate(piece.document_date)}`}
        </span>
        {piece.has_file && (
          <a
            href={pieceFileUrl(piece.id)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline underline-offset-2"
          >
            Voir le scan
          </a>
        )}
      </div>
    </li>
  )
}

/**
 * US-1008 : « Mes certificats » montre les formations du dossier Carrières, y compris celles recueillies par
 * la DRH, et les pièces déposées qu'elle n'a pas encore complétées. La DRH les valide dans Carrières.
 */
export default function PiecesPage() {
  const location = useLocation()
  const { data, error, loading } = useLoader(load)
  const pieces = data?.pieces
  const open = data?.completion.is_complete
  const deposit = open && (
    <Link to={DEPOSIT_PATH} className={DEPOSIT_LINK}>
      <span className="material-symbols-outlined" aria-hidden="true">
        add
      </span>
      Déposer une pièce
    </Link>
  )

  return (
    <Page
      account
      title="Mes certificats"
      subtitle="Vos diplômes et certificats, tels que la DRH les a enregistrés."
      actions={deposit}
    >
      <div className="flex flex-col gap-4">
        {location.state?.notice && <Alert tone="success">{location.state.notice}</Alert>}
        {loading && <p role="status">Chargement…</p>}
        {data && !open && <Checklist completion={data.completion} />}
        {error && <Alert>{error.message}</Alert>}
        {pieces && pieces.length === 0 && open && (
          <p className="rounded-xl bg-section p-4 text-help">
            Aucune pièce pour le moment. Déposez la photo ou le PDF d'un diplôme : la DRH le complétera.
          </p>
        )}
        {pieces && pieces.length > 0 && (
          <ul aria-label="Mes pièces" className="flex flex-col gap-3">
            {pieces.map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
          </ul>
        )}
      </div>
    </Page>
  )
}
