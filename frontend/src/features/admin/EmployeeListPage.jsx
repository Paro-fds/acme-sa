import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { getEmployeesExportUrl, searchQualifiedEmployees } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import EmployeeSearch from './EmployeeSearch.jsx'
import { useUnits } from './useUnits.js'

const PAGE_SIZE = 20
const folderUrl = (employee) => `/admin/employes/${employee.id}`
const plural = (count) => `${count} employé${count > 1 ? 's' : ''}`

/**
 * US-134 : les quatre filtres de la maquette, dans son ordre. `options` : [valeur dans l'adresse, libellé] ;
 * `chip` : texte de la pastille « Filtres actifs ». Région et Direction restent possibles côté serveur et export.
 */
const FILTERS = [
  {
    key: 'min_level',
    label: 'Niveau validé minimum',
    all: 'Tous',
    options: [
      ['BACCALAUREAT', 'Baccalauréat'],
      ['BAC_PLUS_2', 'Bac + 2'],
      ['LICENCE', 'Licence'],
      ['MASTER', 'Master'],
    ],
    chip: (label) => `${label} et plus`,
  },
  {
    key: 'domain',
    label: 'Domaine',
    all: 'Tous',
    options: ['Comptabilité', 'Gestion', 'Finance', 'Économie', 'Informatique', 'Droit', 'Agronomie', 'Autre'].map((d) => [d, d]),
  },
  { key: 'agency', label: 'Agence', all: 'Toutes' },
  {
    key: 'folder_status',
    label: 'Statut du dossier',
    all: 'Tous',
    options: ['Profil incomplet', 'Profil complet', 'Dossier complet'].map((s) => [s, s]),
  },
]

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const FOLDER_TONES = {
  FOLDER_COMPLETE: 'bg-status-done-bg text-status-done-text',
  PROFILE_COMPLETE: 'bg-info-bg text-info-text',
  INCOMPLETE: 'bg-status-progress-bg text-status-progress-text',
}

/** Statut du dossier : Profil incomplet, Profil complet, Dossier complet (choix du 2026-10-20 : pas de pourcentage). */
function FolderStatusBadge({ employee }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${FOLDER_TONES[employee.folder_status] ?? FOLDER_TONES.INCOMPLETE}`}
    >
      {employee.folder_status_label}
    </span>
  )
}

const agencyOf = (employee) => employee.agency_name || employee.agency_code
const jobOf = (employee) => [employee.position, agencyOf(employee)].filter(Boolean).join(' · ')
const levelOf = (employee) =>
  [employee.validated_level_label, employee.validated_domain_label].filter(Boolean).join(' · ') || '—'
const dateOf = (employee) =>
  employee.updated_at
    ? new Date(employee.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

function useFolderState() {
  return { listSearch: useLocation().search }
}

function EmployeeCards({ employees }) {
  const state = useFolderState()
  return (
    <ul aria-label="Employés" className="flex flex-col divide-y divide-rh-line lg:hidden">
      {employees.map((employee) => (
        <li key={employee.id}>
          <Link to={folderUrl(employee)} state={state} className="flex min-h-11 items-center gap-3 p-4 hover:bg-rh-canvas">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-bold text-primary">{employee.display_name}</span>
              <span className="text-sm text-rh-text">
                {employee.employee_code} · {jobOf(employee)}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-rh-text">
                <FolderStatusBadge employee={employee} />
                {employee.validated_level_label && <span>{levelOf(employee)}</span>}
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
      <table aria-label="Employés" className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-rh-canvas text-sm font-bold whitespace-nowrap text-rh-text">
            <th scope="col" className="px-4 py-3.5">Employé</th>
            <th scope="col" className="px-3 py-3.5">Poste et agence</th>
            <th scope="col" className="px-3 py-3.5">Niveau validé</th>
            <th scope="col" className="px-3 py-3.5">Embauche</th>
            <th scope="col" className="px-3 py-3.5">Dossier</th>
            <th scope="col" className="px-4 py-3.5">Mis à jour</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rh-line text-rh-strong">
          {employees.map((employee) => (
            <tr key={employee.id} onClick={() => navigate(folderUrl(employee), { state })} className="cursor-pointer hover:bg-rh-canvas">
              <td className="px-4 py-3.5">
                <Link
                  to={folderUrl(employee)}
                  state={state}
                  onClick={(event) => event.stopPropagation()}
                  className="flex flex-col hover:underline"
                >
                  <span className="font-bold whitespace-nowrap text-primary">{employee.display_name}</span>
                  <span className="text-rh-text">{employee.employee_code}</span>
                </Link>
              </td>
              <td className="px-3 py-3.5">{jobOf(employee)}</td>
              <td className="px-3 py-3.5">{levelOf(employee)}</td>
              <td className="px-3 py-3.5 tabular-nums">{employee.hire_year ?? '—'}</td>
              <td className="px-3 py-3.5">
                <FolderStatusBadge employee={employee} />
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap text-rh-text">{dateOf(employee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** « 1 à 20 sur 45 », « Précédent » et « Suivant ». */
function TableFooter({ data, onChange }) {
  const first = (data.page - 1) * data.page_size + 1
  const last = first + data.items.length - 1
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rh-line px-4 py-3.5 text-rh-text">
      <span className="tabular-nums">
        {first} à {last} sur {data.total}
      </span>
      <nav aria-label="Pagination" className="flex gap-2">
        <Button variant="secondary" className="w-auto" onClick={() => onChange(data.page - 1)} disabled={data.page <= 1}>
          Précédent
        </Button>
        <Button variant="secondary" className="w-auto" onClick={() => onChange(data.page + 1)} disabled={data.page >= data.page_count}>
          Suivant
        </Button>
      </nav>
    </div>
  )
}

function EmptyState({ search, onClearSearch }) {
  if (search?.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
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
  return <p className="p-6 text-center text-rh-text">Aucun employé ne correspond à ces filtres.</p>
}

/**
 * US-17 → US-19, US-602, US-603 ; US-134 (refonte du 2026-10-19) : « Employés ».
 * Recherche, quatre filtres et leurs pastilles, « N employés sur M », tableau (cartes sur téléphone), 20 par page,
 * « Exporter la liste » (Excel de la liste filtrée).
 */
export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { agencies } = useUnits()
  const page = readPage(searchParams)
  const search = searchParams.get('search') ?? ''
  const values = Object.fromEntries(FILTERS.map(({ key }) => [key, searchParams.get(key) ?? '']))
  const criteria = {
    search,
    agency: values.agency,
    folderStatus: values.folder_status,
    minLevel: values.min_level,
    domain: values.domain,
  }
  const optionsOf = (filter) => filter.options ?? agencies.map((unit) => [unit.label, unit.label])

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

  const activeFilters = FILTERS.filter(({ key }) => values[key]).map((filter) => {
    const label = optionsOf(filter).find(([value]) => value === values[filter.key])?.[1] ?? values[filter.key]
    return { key: filter.key, label: filter.chip ? filter.chip(label) : label }
  })

  return (
    <Page
      account="admin"
      wide
      title="Employés"
      subtitle="Trouvez les employés qualifiés : par nom, niveau validé, domaine ou agence."
      headerActions={
        <a
          href={getEmployeesExportUrl({ ...criteria, format: 'xlsx' })}
          download
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border-2 border-primary bg-surface px-4 font-bold text-primary hover:bg-info-bg"
        >
          <span className="material-symbols-outlined" aria-hidden="true">download</span>
          Exporter la liste
        </a>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-xl border border-rh-line bg-surface p-4 shadow-card sm:p-5">
          <EmployeeSearch value={search} onSearch={(term) => changeCriteria('search', term)} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FILTERS.map((filter) => (
              <div key={filter.key} className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={`filter-${filter.key}`} className="text-sm font-semibold text-rh-strong">
                  {filter.label}
                </label>
                <select
                  id={`filter-${filter.key}`}
                  value={values[filter.key] || filter.all}
                  onChange={(event) => changeCriteria(filter.key, event.target.value)}
                  className={`min-h-12 w-full min-w-0 rounded-lg border px-2.5 text-base text-rh-strong ${
                    values[filter.key] ? 'border-primary bg-info-bg' : 'border-border-input bg-surface'
                  }`}
                >
                  <option value={filter.all}>{filter.all}</option>
                  {optionsOf(filter).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.length > 0 && (
              <>
                <span className="text-rh-text">Filtres actifs :</span>
                <ul aria-label="Filtres actifs" className="contents">
                  {activeFilters.map((filter) => (
                    <li
                      key={filter.key}
                      className="inline-flex items-center gap-1 rounded-full bg-info-bg py-1 pr-1 pl-3 font-semibold text-info-text"
                    >
                      {filter.label}
                      <button
                        type="button"
                        aria-label={`Retirer le filtre ${filter.label}`}
                        onClick={() => changeCriteria(filter.key, '')}
                        className="inline-flex size-8 items-center justify-center rounded-full hover:bg-info-border"
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={clearAllFilters} className="min-h-11 px-2 font-medium text-primary hover:underline">
                  Tout effacer
                </button>
              </>
            )}
            {data?.total > 0 && (
              <span className="ml-auto font-bold text-rh-strong">
                {plural(data.total)} sur {data.total_all}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-rh-line bg-surface shadow-card">
          {loading && !data ? (
            <p role="status" className="p-6 text-center text-rh-muted">
              Chargement…
            </p>
          ) : error ? (
            <div className="p-4">
              <Alert>{error.message}</Alert>
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState search={search} onClearSearch={() => changeCriteria('search', '')} />
          ) : (
            <>
              <EmployeeCards employees={data.items} />
              <EmployeeTable employees={data.items} />
              <TableFooter data={data} onChange={changePage} />
            </>
          )}
        </div>
        <p className="text-sm text-rh-text">Chaque export est enregistré dans le journal d’audit.</p>
      </div>
    </Page>
  )
}
