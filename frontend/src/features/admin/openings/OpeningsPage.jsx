import { Link, useSearchParams } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { listOpenings } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { formatDate } from '../../../lib/format.js'
import { useLoader } from '../../../lib/useLoader.js'
import JobCatalogue from './JobCatalogue.jsx'
import { canEdit, LOGIN_PATH, OPENINGS_PATH, OpeningStatusBadge } from './openingParts.jsx'

const CATALOGUE = 'catalogue'

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
          {opening.unit_label} · du {formatDate(opening.opens_on)} au {formatDate(opening.closes_on)}
        </p>
      </div>
      <OpeningStatusBadge opening={opening} />
    </li>
  )
}

function Tab({ selected, onSelect, icon, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`-mb-px flex min-h-12 items-center gap-2 border-b-[3px] px-3 text-base font-semibold sm:px-4 ${
        selected ? 'border-primary text-primary' : 'border-transparent text-help hover:text-heading'
      }`}
    >
      <span className="material-symbols-outlined text-xl" aria-hidden="true">{icon}</span>
      {children}
    </button>
  )
}

/**
 * US-802 : postes saisis par les RH, avec leur statut (Brouillon, Publié, Clôturé, Pourvu).
 * US-119 : second onglet « Catalogue des postes ACME » (`?onglet=catalogue`), d'où l'on publie un poste à partir de sa fiche.
 */
export default function OpeningsPage() {
  const { data, loading, error } = useLoader(load, { loginPath: LOGIN_PATH })
  const [params, setParams] = useSearchParams()
  const catalogue = params.get('onglet') === CATALOGUE
  const show = (tab) => setParams(tab ? { onglet: tab } : {}, { replace: true })

  return (
    <Page
      account="admin"
      wide
      title="Postes ouverts"
      subtitle="Un Agent RH saisit le poste ; un Administrateur le valide et le publie."
      headerActions={
        data &&
        canEdit(data.me) && (
          <Link
            to={`${OPENINGS_PATH}/nouveau`}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Saisir un poste
          </Link>
        )
      }
    >
      <div role="tablist" aria-label="Postes ouverts" className="flex gap-1 overflow-x-auto border-b border-border">
        <Tab selected={!catalogue} onSelect={() => show(null)} icon="campaign">
          Postes publiés
        </Tab>
        <Tab selected={catalogue} onSelect={() => show(CATALOGUE)} icon="menu_book">
          Catalogue des postes ACME
        </Tab>
      </div>
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {catalogue && data && <JobCatalogue me={data.me} />}
      {!catalogue && data && data.openings.length === 0 && <p className="text-help">Aucun poste saisi pour le moment.</p>}
      {!catalogue && data && data.openings.length > 0 && (
        <ul aria-label="Postes" className="flex flex-col gap-3">
          {data.openings.map((opening) => (
            <OpeningItem key={opening.id} opening={opening} />
          ))}
        </ul>
      )}
    </Page>
  )
}
