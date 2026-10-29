import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import { getEmployeesExportUrl, searchQualifiedEmployees } from '../../api/admin.js'
import { getReferential } from '../../api/referential.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  searchQualifiedEmployees: vi.fn(),
  getEmployeesExportUrl: vi.fn(({ minLevel = '', format = '' } = {}) => `/export?format=${format}&min_level=${minLevel}`),
}))
vi.mock('../../api/referential.js', () => ({ getReferential: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const employee = (id, last_name, first_name, overrides = {}) => ({
  id,
  employee_code: `AC-${id}`,
  last_name,
  first_name,
  display_name: `${first_name} ${last_name}`,
  agency_code: 'PV',
  agency_name: 'Agence Démo Nord',
  position: 'Agent de crédit',
  folder_status: 'INCOMPLETE',
  folder_status_label: 'Profil incomplet',
  validated_level_label: null,
  validated_domain_label: null,
  updated_at: null,
  hire_year: null,
  ...overrides,
})

const JOSEPH = employee('1001', 'JOSEPH', 'Jean', {
  folder_status: 'FOLDER_COMPLETE',
  folder_status_label: 'Dossier complet',
  validated_level_label: 'Licence',
  validated_domain_label: 'Comptabilité',
  updated_at: '2026-10-08T10:00:00Z',
  hire_year: 2018,
})
const BAPTISTE = employee('1008', 'BAPTISTE', 'Marc')

const pageOf = (items, { total = items.length, total_all = 412, page = 1, page_count = 1 } = {}) => ({
  items,
  total,
  total_all,
  page,
  page_size: 20,
  page_count,
})

const UNITS = [
  { code: 'PV', label: 'Agence Démo Nord', type: 'AGENCE' },
  { code: 'AD', label: 'Agence Démo', type: 'AGENCE' },
  { code: 'RD1', label: 'Région Démo 1', type: 'REGION' },
]

function FolderProbe() {
  const { id } = useParams()
  return <p>Dossier {id}</p>
}

function LocationProbe() {
  const { search } = useLocation()
  return <output aria-label="adresse">{search}</output>
}

function renderAt(path = '/admin/employes') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route
          path="/admin/employes"
          element={
            <>
              <EmployeeListPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/admin/employes/:id" element={<FolderProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Les cartes (téléphone) et le tableau (ordinateur) sont tous deux dans le DOM ; le CSS choisit. */
const cards = () => screen.findByRole('list', { name: 'Employés' })
const table = () => screen.getByRole('table', { name: 'Employés' })
const lastCall = () => searchQualifiedEmployees.mock.lastCall[0]
const options = (label) => within(screen.getByLabelText(label)).getAllByRole('option').map((option) => option.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  searchQualifiedEmployees.mockResolvedValue(pageOf([BAPTISTE, JOSEPH], { total: 7 }))
  getReferential.mockResolvedValue({ units: UNITS, mappings: [], to_attach: [] })
})

describe('US-134 CA-01, CA-02 — en-tête, export et recherche', () => {
  it('titre, phrase, « Exporter la liste » en Excel avec les filtres ; aucun emoji', async () => {
    renderAt('/admin/employes?min_level=LICENCE')
    await cards()
    expect(screen.getByRole('heading', { name: 'Employés', level: 1 })).toBeVisible()
    expect(screen.getByText('Trouvez les employés qualifiés : par nom, niveau validé, domaine ou agence.')).toBeVisible()
    const exportLink = screen.getByRole('link', { name: 'Exporter la liste' })
    expect(exportLink).toHaveAttribute('href', '/export?format=xlsx&min_level=LICENCE')
    expect(exportLink).toHaveAttribute('download')
    expect(getEmployeesExportUrl).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'xlsx', minLevel: 'LICENCE' }))
    expect(screen.queryByRole('button', { name: /Exporter/ })).not.toBeInTheDocument()
    expect(screen.getByText('Chaque export est enregistré dans le journal d’audit.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('« Rechercher un employé » est un libellé visible ; « Nom, prénom ou matricule »', async () => {
    renderAt()
    await cards()
    const box = screen.getByRole('searchbox', { name: 'Rechercher un employé' })
    expect(box).toHaveAttribute('placeholder', 'Nom, prénom ou matricule')
    expect(screen.getByText('Rechercher un employé', { selector: 'label' })).toBeVisible()
  })
})

describe('US-134 CA-03, CA-04 — quatre filtres et filtres actifs', () => {
  it('Niveau validé minimum, Domaine, Agence, Statut du dossier ; plus de Région ni de Direction', async () => {
    renderAt()
    await cards()
    const labels = screen.getAllByRole('combobox').map((select) => select.labels[0].textContent)
    expect(labels).toEqual(['Niveau validé minimum', 'Domaine', 'Agence', 'Statut du dossier'])
    expect(options('Niveau validé minimum')).toEqual(['Tous', 'Baccalauréat', 'Bac + 2', 'Licence', 'Master'])
    await vi.waitFor(() => expect(options('Agence')).toEqual(['Toutes', 'Agence Démo Nord', 'Agence Démo']))
    expect(options('Statut du dossier')).toEqual(['Tous', 'Profil incomplet', 'Profil complet', 'Dossier complet'])
    expect(screen.queryByLabelText('Région')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Direction')).not.toBeInTheDocument()
  })

  it('un filtre devient une pastille (« Licence et plus ») que l’on peut retirer ; « N employés sur M »', async () => {
    const user = userEvent.setup()
    renderAt()
    await cards()
    expect(screen.getByText('7 employés sur 412')).toBeVisible()

    await user.selectOptions(screen.getByLabelText('Niveau validé minimum'), 'Licence')
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?min_level=LICENCE')
    expect(lastCall()).toMatchObject({ minLevel: 'LICENCE', page: 1 })
    await user.selectOptions(screen.getByLabelText('Domaine'), 'Finance')

    const active = screen.getByRole('list', { name: 'Filtres actifs' })
    expect(within(active).getAllByRole('listitem').map((item) => item.textContent.replace(/close$/, ''))).toEqual(['Licence et plus', 'Finance'])
    await user.click(screen.getByRole('button', { name: 'Retirer le filtre Licence et plus' }))
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?domain=Finance')

    await user.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(screen.getByLabelText('adresse')).toHaveTextContent(/^$/)
    expect(screen.queryByRole('list', { name: 'Filtres actifs' })).not.toBeInTheDocument()
  })
})

describe('US-134 CA-05 — le tableau et les cartes', () => {
  it('Employé, Poste et agence, Niveau validé, Embauche, Dossier, Mis à jour', async () => {
    renderAt()
    await cards()
    const headers = within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Employé', 'Poste et agence', 'Niveau validé', 'Embauche', 'Dossier', 'Mis à jour'])
    const [baptiste, joseph] = within(table()).getAllByRole('row').slice(1)
    expect(within(joseph).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Jean JOSEPHAC-1001',
      'Agent de crédit · Agence Démo Nord',
      'Licence · Comptabilité',
      '2018',
      'Dossier complet',
      '8 oct. 2026',
    ])
    expect(within(joseph).getByRole('link')).toHaveAttribute('href', '/admin/employes/1001')
    expect(within(baptiste).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Marc BAPTISTEAC-1008',
      'Agent de crédit · Agence Démo Nord',
      '—',
      '—',
      'Profil incomplet',
      '—',
    ])
  })

  it('cartes sur téléphone : nom, matricule, poste et agence, dossier', async () => {
    renderAt()
    const items = within(await cards()).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link').getAttribute('href'))).toEqual([
      '/admin/employes/1008',
      '/admin/employes/1001',
    ])
    expect(items[1]).toHaveTextContent('AC-1001 · Agent de crédit · Agence Démo Nord')
    expect(items[1]).toHaveTextContent('Dossier complet')
    expect(items[1]).toHaveTextContent('Licence · Comptabilité')
  })

  it('toucher une ligne ouvre le dossier', async () => {
    const user = userEvent.setup()
    renderAt()
    await cards()
    await user.click(within(table()).getAllByRole('row')[1].querySelector('td:nth-child(2)'))
    expect(await screen.findByText('Dossier 1008')).toBeInTheDocument()
  })

  it('aucune action de modification', async () => {
    renderAt()
    await cards()
    const buttons = screen.queryAllByRole('button').map((button) => button.textContent)
    expect(buttons.some((text) => /modifier|supprimer|enregistrer|valider|réinitialiser/i.test(text))).toBe(false)
  })
})

describe('US-134 CA-06 — pagination', () => {
  it('« 1 à 20 sur 45 », « Précédent » désactivé en page 1, « Suivant » charge la page 2', async () => {
    searchQualifiedEmployees.mockImplementation(({ page }) =>
      Promise.resolve(pageOf([employee(`p${page}`, `NOM${page}`, 'Test')], { total: 45, page, page_count: 3 })),
    )
    const user = userEvent.setup()
    renderAt()
    await cards()

    expect(screen.getByText('1 à 1 sur 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await within(await cards()).findByText('Test NOM2')).toBeInTheDocument()
    expect(screen.getByText('21 à 21 sur 45')).toBeInTheDocument()
    expect(lastCall()).toMatchObject({ page: 2 })
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?page=2')
  })

  it('la pagination conserve les filtres de l’adresse ; page invalide → page 1', async () => {
    searchQualifiedEmployees.mockResolvedValue(pageOf([BAPTISTE], { total: 45, page: 1, page_count: 3 }))
    const user = userEvent.setup()
    renderAt('/admin/employes?domain=Finance&page=abc')
    await cards()
    expect(lastCall()).toMatchObject({ page: 1, domain: 'Finance' })

    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?domain=Finance&page=2')
  })

  it('une seule page : « Précédent » et « Suivant » désactivés', async () => {
    renderAt()
    await cards()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
  })

  it('aucun employé pour ces filtres → message', async () => {
    searchQualifiedEmployees.mockResolvedValue(pageOf([]))
    renderAt('/admin/employes?domain=Droit')
    expect(await screen.findByText('Aucun employé ne correspond à ces filtres.')).toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    searchQualifiedEmployees.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderAt()
    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
