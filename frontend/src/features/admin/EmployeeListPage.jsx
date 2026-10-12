import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { getEmployeesExportUrl, searchQualifiedEmployees } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Avatar from '../../components/Avatar.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { formatLocalDate } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import EmployeeSearch from './EmployeeSearch.jsx'
import { useUnits } from './useUnits.js'

const PAGE_SIZE = 20
const folderUrl = (employee) => `/admin/employes/${employee.id}`
const plural = (count) => `${count} employé${count > 1 ? 's' : ''}`

/** Filtres de l'écran A06 : nom du paramètre dans l'adresse, libellé, valeur « tout ». */
const FILTERS = [
  { key: 'agency', label: 'Agence', all: 'Toutes' },
  { key: 'region', label: 'Région', all: 'Toutes' },
  { key: 'direction', label: 'Direction', all: 'Toutes' },
  { key: 'folder_status', label: 'Statut du dossier', all: 'Tous', options: ['Profil incomplet', 'Profil complet', 'Dossier complet'] },
  { key: 'min_level', label: 'Niveau validé', all: 'Tous', options: ['au moins Baccalauréat', 'au moins Licence', 'au moins Master'] },
  {
    key: 'domain',
    label: 'Domaine',
    all: 'Tous',
    options: ['Comptabilité', 'Gestion', 'Finance', 'Économie', 'Informatique', 'Droit', 'Agronomie', 'Autre'],
  },
]

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const FOLDER_TONES = {
  FOLDER_COMPLETE: 'border-status-done-border bg-status-done-bg text-status-done-text',
  PROFILE_COMPLETE: 'border-info-border bg-info-bg text-info-text',
  INCOMPLETE: 'border-status-progress-border bg-status-progress-bg text-status-progress-text',
}

/** A06 : statut du dossier (Profil incomplet, Profil complet, Dossier complet). */
function FolderStatusBadge({ employee }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${FOLDER_TONES[employee.folder_status] ?? FOLDER_TONES.INCOMPLETE}`}
    >
      {employee.folder_status_label}
    </span>
  )
}

const agencyOf = (employee) => employee.agency_name || employee.agency_code
const dateOf = (employee) => (employee.updated_at ? formatLocalDate(employee.updated_at) : '—')

function useFolderState() {
  return { listSearch: useLocation().search }
}

function EmployeeCards({ employees }) {
  const state = useFolderState()
  return (
    <ul aria-label="Employés" className="flex flex-col gap-2 lg:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <Link
            to={folderUrl(employee)}
            state={state}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-rh-line bg-surface p-4 hover:border-primary"
          >
            <Avatar firstName={employee.first_name} lastName={employee.last_name} photoUrl={employee.photo_url} size="md" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="font-semibold text-primary">{employee.display_name}</span>
              <span className="text-sm text-rh-text">
                {employee.employee_code} · {agencyOf(employee)} · {employee.position}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-rh-muted">
                <FolderStatusBadge employee={employee} />
                {employee.validated_level_label && <span>{employee.validated_level_label}</span>}
                {employee.validated_domain_label && <span>· {employee.validated_domain_label}</span>}
              </span>
            </span>
            <span className="material-symbols-outlined text-rh-muted" aria-hidden="true">chevron_right</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function EmployeeTable({ employees }) {
  const navigate = useNavigate()
  const state = useFolderState()
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table aria-label="Employés" className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-rh-line text-xs font-semibold tracking-wider text-rh-muted uppercase">
            <th scope="col" className="px-4 py-3">Nom</th>
            <th scope="col" className="px-4 py-3">Matricule</th>
            <th scope="col" className="px-4 py-3">Agence</th>
            <th scope="col" className="px-4 py-3">Poste</th>
            <th scope="col" className="px-4 py-3">Statut du dossier</th>
            <th scope="col" className="px-4 py-3">Niveau validé</th>
            <th scope="col" className="px-4 py-3">Domaine</th>
            <th scope="col" className="px-4 py-3">Dernière mise à jour</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rh-hover text-rh-text">
          {employees.map((employee) => (
            <tr key={employee.id} onClick={() => navigate(folderUrl(employee), { state })} className="cursor-pointer hover:bg-rh-canvas">
              <td className="px-4 py-3.5">
                <Link
                  to={folderUrl(employee)}
                  state={state}
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-3 font-medium text-primary hover:underline"
                >
                  <Avatar firstName={employee.first_name} lastName={employee.last_name} photoUrl={employee.photo_url} size="sm" />
                  {employee.display_name}
                </Link>
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">{employee.employee_code}</td>
              <td className="px-4 py-3.5">{agencyOf(employee)}</td>
              <td className="px-4 py-3.5">{employee.position}</td>
              <td className="px-4 py-3.5">
                <FolderStatusBadge employee={employee} />
              </td>
              <td className="px-4 py-3.5">{employee.validated_level_label || '—'}</td>
              <td className="px-4 py-3.5">{employee.validated_domain_label || '—'}</td>
              <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">{dateOf(employee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A06 : « 1 à 5 sur 12 » et la pagination sous le tableau. */
function TableFooter({ data, onChange }) {
  const first = (data.page - 1) * data.page_size + 1
  const last = first + data.items.length - 1
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rh-line pt-4 text-sm text-rh-text">
      <span className="tabular-nums">
        {first} à {last} sur {data.total}
      </span>
      {data.page_count > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <Button variant="secondary" className="w-auto" onClick={() => onChange(data.page - 1)} disabled={data.page <= 1}>
            Précédent
          </Button>
          <span className="shrink-0 tabular-nums">
            Page {data.page} sur {data.page_count}
          </span>
          <Button
            variant="secondary"
            className="w-auto"
            onClick={() => onChange(data.page + 1)}
            disabled={data.page >= data.page_count}
          >
            Suivant
          </Button>
        </nav>
      )}
    </div>
  )
}

function EmptyState({ search, onClearSearch }) {
  if (search?.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-rh-line p-6 text-center">
        <span className="material-symbols-outlined text-[32px] text-rh-muted" aria-hidden="true">search_off</span>
        <p className="font-semibold text-rh-strong">Aucun employé ne correspond à votre recherche.</p>
        <div className="w-full max-w-xs">
          <Button variant="secondary" onClick={onClearSearch}>
            Effacer la recherche
          </Button>
        </div>
      </div>
    )
  }
  return <p className="rounded-lg border border-rh-line p-6 text-center text-rh-text">Aucun employé ne correspond à ces filtres.</p>
}

function ExportMenu({ criteria }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const urlFor = (format) => getEmployeesExportUrl({ ...criteria, format })
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-input bg-surface px-4 text-sm font-medium text-rh-text hover:bg-rh-canvas"
      >
        <span className="material-symbols-outlined text-lg text-rh-muted" aria-hidden="true">download</span>
        Exporter (Excel, CSV)
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-md border border-rh-line bg-surface py-1 shadow-modal">
          <a href={urlFor('csv')} download onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-sm text-rh-text hover:bg-rh-hover">
            Exporter en CSV (.csv)
          </a>
          <a href={urlFor('xlsx')} download onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-sm text-rh-text hover:bg-rh-hover">
            Exporter en Excel (.xlsx)
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * US-17 → US-19, US-602, US-603 ; US-108 : écran A06 « Employés ».
 * Recherche, six filtres, filtres actifs, tableau (statut du dossier, niveau validé, domaine, dernière mise à jour),
 * pagination ; l'agence s'affiche avec son libellé officiel.
 */
export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { agencies, regions, directions } = useUnits()
  const page = readPage(searchParams)
  const search = searchParams.get('search') ?? ''
  const values = Object.fromEntries(FILTERS.map(({ key }) => [key, searchParams.get(key) ?? '']))
  const criteria = {
    search,
    agency: values.agency,
    region: values.region,
    direction: values.direction,
    folderStatus: values.folder_status,
    minLevel: values.min_level,
    domain: values.domain,
  }
  const unitOptions = { agency: agencies, region: regions, direction: directions }

  const { data, error, loading } = useLoader(() => searchQualifiedEmployees({ ...criteria, page, pageSize: PAGE_SIZE }), {
    loginPath: '/admin/connexion',
    key: searchParams.toString(),
  })

  function changeCriteria(name, value) {
    const params = new URLSearchParams(searchParams)
    if (value && value.trim() && !FILTERS.some((filter) => filter.key === name && filter.all === value)) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function changePage(next) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
    window.scrollTo?.({ top: 0 })
  }

  function clearAllFilters() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    setSearchParams(params, { replace: true })
  }

  const activeFilters = FILTERS.filter(({ key }) => values[key]).map(({ key, label }) => ({ key, label: `${label} : ${values[key]}` }))
  const unfiltered = !search && activeFilters.length === 0

  return (
    <Page
      account="admin"
      wide
      title="Employés"
      subtitle={unfiltered && data ? `${plural(data.total)} actif${data.total > 1 ? 's' : ''}` : undefined}
      headerActions={
        <div className="flex flex-col items-end gap-1.5">
          <ExportMenu criteria={criteria} />
          <p className="text-xs text-rh-muted">Chaque export est enregistré dans le journal d'audit.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-5 rounded-xl border border-rh-line bg-surface p-4 shadow-card sm:p-6">
        <EmployeeSearch value={search} onSearch={(term) => changeCriteria('search', term)} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {FILTERS.map((filter) => (
            <div key={filter.key} className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`filter-${filter.key}`} className="text-xs font-semibold text-rh-text">
                {filter.label}
              </label>
              <select
                id={`filter-${filter.key}`}
                value={values[filter.key] || filter.all}
                onChange={(event) => changeCriteria(filter.key, event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-md border border-border-input bg-surface px-2 text-sm text-rh-text"
              >
                <option>{filter.all}</option>
                {(filter.options ?? unitOptions[filter.key].map((unit) => unit.label)).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rh-hover pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-rh-muted">Filtres actifs :</span>
              {activeFilters.map((filter) => (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1 rounded-full border border-info-border bg-info-bg py-1 pr-1 pl-2.5 text-xs font-medium text-info-text"
                >
                  {filter.label}
                  <button
                    type="button"
                    aria-label={`Supprimer le filtre ${filter.label}`}
                    onClick={() => changeCriteria(filter.key, '')}
                    className="inline-flex size-6 items-center justify-center rounded-full hover:bg-info-border"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                  </button>
                </span>
              ))}
              <button type="button" onClick={clearAllFilters} className="min-h-11 px-2 text-xs font-medium text-primary hover:underline">
                Tout effacer
              </button>
            </div>
            {data && <span className="text-sm font-semibold text-rh-text">{plural(data.total)}</span>}
          </div>
        )}

        {loading && !data ? (
          <p role="status">Chargement…</p>
        ) : error ? (
          <Alert>{error.message}</Alert>
        ) : data.items.length === 0 ? (
          <EmptyState search={search} onClearSearch={() => changeCriteria('search', '')} />
        ) : (
          <>
            {search && activeFilters.length === 0 && <p className="text-sm text-rh-text">{plural(data.total)}</p>}
            <EmployeeCards employees={data.items} />
            <EmployeeTable employees={data.items} />
            <TableFooter data={data} onChange={changePage} />
          </>
        )}
      </div>
    </Page>
  )
}
