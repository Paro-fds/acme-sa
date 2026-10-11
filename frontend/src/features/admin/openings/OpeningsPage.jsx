import { Link } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { listOpenings } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'
import { canEdit, LOGIN_PATH, OPENINGS_PATH, OpeningStatusBadge } from './openingParts.jsx'

async function load() {
  const [openings, me] = await Promise.all([listOpenings(), getAdminMe()])
  return { openings: openings.items, me }
}

function OpeningItem({ opening }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to={`${OPENINGS_PATH}/${opening.id}`}
          className="text-base font-semibold break-words text-primary underline-offset-2 hover:underline"
        >
          {opening.title}
          <span className="font-normal text-help"> · {opening.code}</span>
        </Link>
        <p className="text-sm text-help">
          {opening.unit_label} · grade {opening.target_grade} · du {formatDate(opening.opens_on)} au {formatDate(opening.closes_on)}
        </p>
      </div>
      <OpeningStatusBadge opening={opening} />
    </li>
  )
}

/** US-802 : postes saisis par les RH, avec leur statut (Brouillon, Publié, Clôturé, Pourvu). */
export default function OpeningsPage() {
  const { data, loading, error } = useLoader(load, { loginPath: LOGIN_PATH })

  return (
    <Page account="admin" wide title="Postes ouverts">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="hidden text-2xl font-bold tracking-tight text-primary md:block">Postes ouverts</h2>
          <p className="text-sm text-help">
            Un Agent RH saisit le poste ; un Administrateur le valide et le publie.
          </p>
        </div>
        {data && canEdit(data.me) && (
          <Link
            to={`${OPENINGS_PATH}/nouveau`}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Saisir un poste
          </Link>
        )}
      </div>
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {data && data.openings.length === 0 && <p className="text-help">Aucun poste saisi pour le moment.</p>}
      {data && data.openings.length > 0 && (
        <ul aria-label="Postes" className="flex flex-col gap-3">
          {data.openings.map((opening) => (
            <OpeningItem key={opening.id} opening={opening} />
          ))}
        </ul>
      )}
    </Page>
  )
}
