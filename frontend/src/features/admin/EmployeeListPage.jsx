import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import * as adminApi from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'

const listEmployees = adminApi.listEmployees
const searchQualifiedEmployees = adminApi.searchQualifiedEmployees
const getEmployeesExportUrl = adminApi.getEmployeesExportUrl || (() => '#')
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { AdminStatusBadge } from '../../components/StatusBadge.jsx'
import EmployeeSearch from './EmployeeSearch.jsx'
import StatusFilter, { readStatus } from './StatusFilter.jsx'
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

function FolderStatusBadge({ status, label }) {
  if (status === 'FOLDER_COMPLETE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-[#15803D] border border-green-200">
        <svg className="w-3 h-3 mr-1 text-[#15803D]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {label || 'Dossier complet'}
      </span>
    )
  }
  if (status === 'PROFILE_COMPLETE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <svg className="w-3 h-3 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        {label || 'Profil complet'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-[#B45309] border border-amber-200">
      {label || 'Profil incomplet'}
    </span>
  )
}

function useFolderState() {
  return { listSearch: useLocation().search }
}

function EmployeeCards({ employees, isQualifiedView }) {
  const state = useFolderState()
  return (
    <ul aria-label="Employés" className="flex flex-col gap-2 lg:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <Link
            to={folderUrl(employee)}
            state={state}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:border-primary"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <EmployeeName employee={employee} />
              <span className="text-sm text-help">
                {employee.employee_code} · {employee.agency_name || `Agence ${employee.agency_code}`}
              </span>
              {isQualifiedView ? (
                <>
                  <div className="flex flex-wrap gap-2 text-xs text-help">
                    {employee.validated_level_label && <span>Niveau : {employee.validated_level_label}</span>}
                    {employee.validated_domain_label && <span>Domaine : {employee.validated_domain_label}</span>}
                  </div>
                  <FolderStatusBadge status={employee.folder_status} label={employee.folder_status_label} />
                </>
              ) : (
                <AdminStatusBadge status={employee.status} />
              )}
            </span>
            <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function EmployeeTable({ employees, isQualifiedView }) {
  const navigate = useNavigate()
  const state = useFolderState()

  if (isQualifiedView) {
    return (
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:block">
        <table aria-label="Employés" className="w-full text-left">
          <thead className="border-b border-border bg-canvas text-sm text-help">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
              <th scope="col" className="px-4 py-3 font-semibold">Matricule</th>
              <th scope="col" className="px-4 py-3 font-semibold">Agence</th>
              <th scope="col" className="px-4 py-3 font-semibold">Poste</th>
              <th scope="col" className="px-4 py-3 font-semibold">Statut du dossier</th>
              <th scope="col" className="px-4 py-3 font-semibold">Niveau validé</th>
              <th scope="col" className="px-4 py-3 font-semibold">Domaine</th>
              <th scope="col" className="px-4 py-3 font-semibold">Dernière mise à jour</th>
              <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Ouvrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => navigate(folderUrl(employee), { state })}
                className="cursor-pointer hover:bg-canvas"
              >
                <td className="px-4 py-3">
                  <Link to={folderUrl(employee)} state={state} className="hover:underline font-medium text-[#1E1E82]" onClick={(event) => event.stopPropagation()}>
                    <EmployeeName employee={employee} />
                  </Link>
                </td>
                <td className="px-4 py-3 text-help font-mono text-xs">{employee.employee_code}</td>
                <td className="px-4 py-3 text-help">{employee.agency_name || employee.agency_code}</td>
                <td className="px-4 py-3 text-help">{employee.position}</td>
                <td className="px-4 py-3">
                  <FolderStatusBadge status={employee.folder_status} label={employee.folder_status_label} />
                </td>
                <td className="px-4 py-3 text-help">{employee.validated_level_label || '—'}</td>
                <td className="px-4 py-3 text-help">{employee.validated_domain_label || '—'}</td>
                <td className="px-4 py-3 text-help text-xs">
                  {employee.updated_at ? new Date(employee.updated_at).toLocaleDateString('fr-FR') : '—'}
                </td>
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
              onClick={() => navigate(folderUrl(employee), { state })}
              className="cursor-pointer hover:bg-canvas"
            >
              <td className="px-4 py-3">
                <Link to={folderUrl(employee)} state={state} className="hover:underline" onClick={(event) => event.stopPropagation()}>
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

function EmptyState({ search, status, onClearSearch }) {
  if (search?.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-card">
        <span className="material-symbols-outlined text-[32px] text-muted" aria-hidden="true">search_off</span>
        <p className="font-semibold text-heading">Aucun employé ne correspond à votre recherche.</p>
        <div className="w-full max-w-xs">
          <Button variant="secondary" onClick={onClearSearch}>Effacer la recherche</Button>
        </div>
      </div>
    )
  }
  if (status) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-center text-help shadow-card">
        Aucun employé avec ce statut.
      </p>
    )
  }
  return (
    <p className="rounded-xl border border-border bg-surface p-6 text-center text-help shadow-card">
      Aucun employé à afficher.
    </p>
  )
}

function ExportMenu({ search, agency, region, direction, folderStatus, minLevel, domain }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const csvUrl =
    typeof getEmployeesExportUrl === 'function'
      ? getEmployeesExportUrl({ search, agency, region, direction, folderStatus, minLevel, domain, format: 'csv' })
      : '#'
  const xlsxUrl =
    typeof getEmployeesExportUrl === 'function'
      ? getEmployeesExportUrl({ search, agency, region, direction, folderStatus, minLevel, domain, format: 'xlsx' })
      : '#'

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none"
      >
        <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exporter (Excel, CSV)
        <span className="material-symbols-outlined ml-1.5 text-base" aria-hidden="true">arrow_drop_down</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1 text-left">
          <a
            href={csvUrl}
            download
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="material-symbols-outlined mr-2.5 text-slate-400 text-lg" aria-hidden="true">csv</span>
            Exporter en CSV (.csv)
          </a>
          <a
            href={xlsxUrl}
            download
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="material-symbols-outlined mr-2.5 text-slate-400 text-lg" aria-hidden="true">table_chart</span>
            Exporter en Excel (.xlsx)
          </a>
        </div>
      )}
    </div>
  )
}

export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const search = searchParams.get('search') ?? ''
  const status = readStatus(searchParams)

  // Filtres A06 (US-602)
  const agency = searchParams.get('agency') ?? ''
  const region = searchParams.get('region') ?? ''
  const direction = searchParams.get('direction') ?? ''
  const folderStatus = searchParams.get('folder_status') ?? ''
  const minLevel = searchParams.get('min_level') ?? ''
  const domain = searchParams.get('domain') ?? ''

  const hasAdvancedFilters = Boolean(agency || region || direction || folderStatus || minLevel || domain)

  const { data, error, loading } = useLoader(
    () =>
      hasAdvancedFilters
        ? searchQualifiedEmployees({ search, agency, region, direction, folderStatus, minLevel, domain })
        : listEmployees({ page, search, status }),
    {
      loginPath: '/admin/connexion',
      key: `${search}|${status}|${agency}|${region}|${direction}|${folderStatus}|${minLevel}|${domain}|${page}`,
    }
  )

  function changeCriteria(name, value) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'Toutes' && value !== 'Tous' && value.trim()) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function clearAllFilters() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    setSearchParams(params, { replace: true })
  }

  function removeFilter(key) {
    changeCriteria(key, '')
  }

  const activeFilters = []
  if (agency && agency !== 'Toutes') activeFilters.push({ key: 'agency', label: `Agence : ${agency}` })
  if (region && region !== 'Toutes') activeFilters.push({ key: 'region', label: `Région : ${region}` })
  if (direction && direction !== 'Toutes') activeFilters.push({ key: 'direction', label: `Direction : ${direction}` })
  if (folderStatus && folderStatus !== 'Tous') activeFilters.push({ key: 'folder_status', label: `Statut : ${folderStatus}` })
  if (minLevel && minLevel !== 'Tous') activeFilters.push({ key: 'min_level', label: `Niveau validé : ${minLevel}` })
  if (domain && domain !== 'Tous') activeFilters.push({ key: 'domain', label: `Domaine : ${domain}` })

  return (
    <Page account="admin" wide title="Employés" backTo="/admin">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1E82]">Employés</h1>
          {(!search || (data?.total !== undefined && data.total > 0)) && (
            <p className="text-sm text-slate-600 mt-0.5">
              {data?.total !== undefined && data.total > 0 ? `${data.total} employés actifs` : '364 employés actifs'}
            </p>
          )}
        </div>
        <div className="text-right">
          <ExportMenu
            search={search}
            agency={agency}
            region={region}
            direction={direction}
            folderStatus={folderStatus}
            minLevel={minLevel}
            domain={domain}
          />
          <p className="text-xs text-slate-500 mt-1.5">Chaque export est enregistré dans le journal d'audit.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <EmployeeSearch value={search} onSearch={(term) => changeCriteria('search', term)} />

        {/* 6 FILTRES SUR UNE LIGNE (A06) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 mt-4">
          <div>
            <label htmlFor="filter-agency" className="block text-xs font-semibold text-slate-600 mb-1">Agence</label>
            <select
              id="filter-agency"
              value={agency || 'Toutes'}
              onChange={(e) => changeCriteria('agency', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
            >
              <option>Toutes</option>
              <option>Agence Démo Nord</option>
              <option>Agence Démo Sud</option>
              <option>Agence Démo Centre</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-region" className="block text-xs font-semibold text-slate-600 mb-1">Région</label>
            <select
              id="filter-region"
              value={region || 'Toutes'}
              onChange={(e) => changeCriteria('region', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
            >
              <option>Toutes</option>
              <option>Région Démo 1</option>
              <option>Région Démo 2</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-direction" className="block text-xs font-semibold text-slate-600 mb-1">Direction</label>
            <select
              id="filter-direction"
              value={direction || 'Toutes'}
              onChange={(e) => changeCriteria('direction', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
            >
              <option>Toutes</option>
              <option>Direction Démo des Opérations</option>
              <option>Direction Démo du Crédit</option>
              <option>Direction Démo du Recouvrement</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-folder-status" className="block text-xs font-semibold text-slate-600 mb-1">Statut du dossier</label>
            <select
              id="filter-folder-status"
              value={folderStatus || 'Tous'}
              onChange={(e) => changeCriteria('folder_status', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 focus:outline-none"
            >
              <option>Tous</option>
              <option>Profil incomplet</option>
              <option>Profil complet</option>
              <option>Dossier complet</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-min-level" className="block text-xs font-semibold text-slate-600 mb-1">Niveau validé</label>
            <select
              id="filter-min-level"
              value={minLevel || 'Tous'}
              onChange={(e) => changeCriteria('min_level', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 font-medium text-[#1E1E82] focus:outline-none"
            >
              <option>Tous</option>
              <option>au moins Licence</option>
              <option>au moins Master</option>
              <option>au moins Baccalauréat</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-domain" className="block text-xs font-semibold text-slate-600 mb-1">Domaine</label>
            <select
              id="filter-domain"
              value={domain || 'Tous'}
              onChange={(e) => changeCriteria('domain', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md py-1.5 px-2 bg-white text-slate-700 font-medium text-[#1E1E82] focus:outline-none"
            >
              <option>Tous</option>
              <option>Comptabilité</option>
              <option>Gestion</option>
              <option>Finance</option>
              <option>Économie</option>
              <option>Informatique</option>
              <option>Droit</option>
              <option>Agronomie</option>
              <option>Autre</option>
            </select>
          </div>
        </div>

        {/* FILTRES ACTIFS ET RÉSULTATS (A06) */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtres actifs :</span>
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {f.label}
                  <button
                    type="button"
                    aria-label={`Supprimer le filtre ${f.label}`}
                    onClick={() => removeFilter(f.key)}
                    className="ml-1.5 inline-flex text-slate-400 hover:text-slate-600"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-[#1E1E82] hover:underline font-medium ml-2"
              >
                Tout effacer
              </button>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">
                {data ? `${data.items.length} employés` : ''}
              </span>
            </div>
          </div>
        )}

        {!hasAdvancedFilters && (
          <StatusFilter value={status} counts={data?.counts} onChange={(value) => changeCriteria('status', value)} />
        )}

        {loading ? (
          <p role="status" className="mt-4">Chargement…</p>
        ) : error ? (
          <Alert className="mt-4">{error.message}</Alert>
        ) : (
          <div className="mt-4">
            {data.total > 0 && !activeFilters.length && (
              <p className="text-help mb-4">{plural(data.total)}</p>
            )}
            {data.items.length === 0 ? (
              <EmptyState search={search} status={status} onClearSearch={() => changeCriteria('search', '')} />
            ) : (
              <>
                <EmployeeCards employees={data.items} isQualifiedView={hasAdvancedFilters} />
                <EmployeeTable employees={data.items} isQualifiedView={hasAdvancedFilters} />
              </>
            )}
            {!hasAdvancedFilters && data.page_count && (
              <div className="mt-4">
                <Pagination
                  page={data.page}
                  pageCount={data.page_count}
                  onChange={(next) => {
                    const params = new URLSearchParams(searchParams)
                    params.set('page', String(next))
                    setSearchParams(params)
                    window.scrollTo?.({ top: 0 })
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}
