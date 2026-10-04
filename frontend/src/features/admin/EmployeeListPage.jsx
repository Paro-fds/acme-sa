import { Link, useNavigate, useSearchParams } from 'react-router'
import { listEmployees } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { AdminStatusBadge } from '../../components/StatusBadge.jsx'
import { useLoader } from '../../lib/useLoader.js'

const folderUrl = (employee) => `/admin/employes/${employee.id}`
const plural = (count) => `${count} employé${count > 1 ? 's' : ''}`

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/** Nouveau nom en principal, ancien en dessous en gris (SD-03). */
function EmployeeName({ employee }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold text-heading">{employee.display_name}</span>
      {employee.previous_name && <span className="text-sm text-muted">anciennement {employee.previous_name}</span>}
    </span>
  )
}

/** Mobile : une carte par employé, entièrement cliquable. */
function EmployeeCards({ employees }) {
  return (
    <ul aria-label="Employés" className="flex flex-col gap-2 lg:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <Link
            to={folderUrl(employee)}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:border-primary"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <EmployeeName employee={employee} />
              <span className="text-sm text-help">
                {employee.employee_code} · Agence {employee.agency_code}
              </span>
              <AdminStatusBadge status={employee.status} />
            </span>
            <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Desktop (≥ 1024 px) : tableau ; toute la ligne ouvre le dossier, le nom est le lien accessible. */
function EmployeeTable({ employees }) {
  const navigate = useNavigate()
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:block">
      <table aria-label="Employés" className="w-full text-left">
        <thead className="border-b border-border bg-canvas text-sm text-help">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
            <th scope="col" className="px-4 py-3 font-semibold">Matricule</th>
            <th scope="col" className="px-4 py-3 font-semibold">Agence</th>
            <th scope="col" className="px-4 py-3 font-semibold">Poste</th>
            <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
            <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Ouvrir</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {employees.map((employee) => (
            <tr
              key={employee.id}
              onClick={() => navigate(folderUrl(employee))}
              className="cursor-pointer hover:bg-canvas"
            >
              <td className="px-4 py-3">
                <Link to={folderUrl(employee)} className="hover:underline" onClick={(event) => event.stopPropagation()}>
                  <EmployeeName employee={employee} />
                </Link>
              </td>
              <td className="px-4 py-3 text-help">{employee.employee_code}</td>
              <td className="px-4 py-3 text-help">{employee.agency_code}</td>
              <td className="px-4 py-3 text-help">{employee.position}</td>
              <td className="px-4 py-3"><AdminStatusBadge status={employee.status} /></td>
              <td className="px-4 py-3 text-muted">
                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Pagination" className="flex items-center gap-3">
      <Button variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 1} className="flex-1 lg:flex-none lg:w-40">
        <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        Précédent
      </Button>
      <p className="shrink-0 text-sm text-help">Page {page} sur {pageCount}</p>
      <Button variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= pageCount} className="flex-1 lg:flex-none lg:w-40">
        Suivant
        <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </Button>
    </nav>
  )
}

function EmployeeList({ page, onPageChange }) {
  const { data, error, loading } = useLoader(() => listEmployees({ page }), { loginPath: '/admin/connexion' })

  if (loading) return <p role="status">Chargement…</p>
  if (error) return <Alert>{error.message}</Alert>

  return (
    <>
      <p className="text-help">{plural(data.total)}</p>
      {data.items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-help shadow-card">
          Aucun employé à afficher.
        </p>
      ) : (
        <>
          <EmployeeCards employees={data.items} />
          <EmployeeTable employees={data.items} />
        </>
      )}
      <Pagination page={data.page} pageCount={data.page_count} onChange={onPageChange} />
    </>
  )
}

/** US-17 : liste des employés actifs, paginée, en lecture seule. */
export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)

  function changePage(next) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
    window.scrollTo?.({ top: 0 })
  }

  return (
    <Page account="admin" wide title="Employés" backTo="/admin">
      <h2 className="text-[26px] leading-8 font-bold">Liste des employés</h2>
      {/* Remonté à chaque page : nouveau chargement. */}
      <EmployeeList key={page} page={page} onPageChange={changePage} />
    </Page>
  )
}
