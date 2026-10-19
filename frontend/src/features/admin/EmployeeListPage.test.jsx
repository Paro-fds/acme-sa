import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import { searchQualifiedEmployees } from '../../api/admin.js'
import { getReferential } from '../../api/referential.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  searchQualifiedEmployees: vi.fn(),
  getEmployeesExportUrl: vi.fn(() => '#'),
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
  ...overrides,
})

const JOSEPH = employee('1001', 'JOSEPH', 'Jean', {
  folder_status: 'FOLDER_COMPLETE',
  folder_status_label: 'Dossier complet',
  validated_level_label: 'Licence',
  validated_domain_label: 'Comptabilité',
  updated_at: '2026-10-02T10:00:00Z',
})
const BAPTISTE = employee('1008', 'BAPTISTE', 'Marc')

const pageOf = (items, { total = items.length, page = 1, page_count = 1 } = {}) => ({
  items,
  total,
  page,
  page_size: 20,
  page_count,
})

const UNITS = [
  { code: 'PV', label: 'Agence Démo Nord', type: 'AGENCE' },
  { code: 'AD', label: 'Agence Démo', type: 'AGENCE' },
  { code: 'RD1', label: 'Région Démo 1', type: 'REGION' },
  { code: 'DOP', label: 'Direction des Opérations (démo)', type: 'DIRECTION' },
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

/** Les cartes (mobile) et le tableau (desktop) sont tous deux dans le DOM ; le CSS choisit. */
const cards = () => screen.findByRole('list', { name: 'Employés' })
const table = () => screen.getByRole('table', { name: 'Employés' })
const lastCall = () => searchQualifiedEmployees.mock.lastCall[0]

describe('EmployeeListPage (US-17, US-108 : écran A06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchQualifiedEmployees.mockResolvedValue(pageOf([BAPTISTE, JOSEPH], { total: 7 }))
    getReferential.mockResolvedValue({ units: UNITS, mappings: [], to_attach: [] })
  })

  it('A06 : nombre d’employés actifs, colonnes de la maquette, agence en libellé officiel', async () => {
    renderAt()
    await cards()

    expect(screen.getByText('7 employés actifs')).toBeInTheDocument()
    const headers = within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual([
      'Nom',
      'Matricule',
      'Agence',
      'Poste',
      'Statut du dossier',
      'Niveau validé',
      'Domaine',
      'Dernière mise à jour',
    ])
    const joseph = within(table()).getAllByRole('row')[2]
    expect(within(joseph).getByRole('link', { name: 'Jean JOSEPH' })).toHaveAttribute('href', '/admin/employes/1001')
    expect(joseph).toHaveTextContent('Agence Démo Nord')
    expect(joseph).toHaveTextContent('Dossier complet')
    expect(joseph).toHaveTextContent('Licence')
    expect(joseph).toHaveTextContent('Comptabilité')
    expect(joseph).toHaveTextContent('02/10/2026')
    expect(screen.queryByText(/Mise à jour (non )?effectuée/)).not.toBeInTheDocument()
  })

  it('A06 : cartes à 390 px avec nom, matricule, agence et statut du dossier', async () => {
    renderAt()
    const items = within(await cards()).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link').getAttribute('href'))).toEqual([
      '/admin/employes/1008',
      '/admin/employes/1001',
    ])
    expect(items[0]).toHaveTextContent('AC-1008 · Agence Démo Nord')
    expect(items[0]).toHaveTextContent('Profil incomplet')
  })

  it('A06 : filtres Agence, Région, Direction tirés du référentiel', async () => {
    renderAt()
    await cards()

    const options = (label) => within(screen.getByLabelText(label)).getAllByRole('option').map((option) => option.textContent)
    await vi.waitFor(() => expect(options('Agence')).toEqual(['Toutes', 'Agence Démo Nord', 'Agence Démo']))
    expect(options('Région')).toEqual(['Toutes', 'Région Démo 1'])
    expect(options('Direction')).toEqual(['Toutes', 'Direction des Opérations (démo)'])
    expect(options('Statut du dossier')).toEqual(['Tous', 'Profil incomplet', 'Profil complet', 'Dossier complet'])
  })

  it('A06 : un filtre s’affiche dans « Filtres actifs » avec le nombre de résultats ; « Tout effacer »', async () => {
    const user = userEvent.setup()
    renderAt()
    await cards()

    await user.selectOptions(screen.getByLabelText('Statut du dossier'), 'Dossier complet')
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?folder_status=Dossier+complet')
    expect(lastCall()).toMatchObject({ folderStatus: 'Dossier complet', page: 1 })
    expect(await screen.findByText('Statut du dossier : Dossier complet')).toBeInTheDocument()
    expect(screen.getByText('7 employés')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(screen.getByLabelText('adresse')).toHaveTextContent(/^$/)
  })

  it('CA-05 : toucher une carte ou une ligne ouvre le dossier', async () => {
    const user = userEvent.setup()
    renderAt()
    await cards()

    await user.click(within(table()).getAllByRole('row')[1].querySelector('td:nth-child(3)'))
    expect(await screen.findByText('Dossier 1008')).toBeInTheDocument()
  })

  it('CA-06 : aucune action de modification', async () => {
    renderAt()
    await cards()

    const buttons = screen.queryAllByRole('button').map((button) => button.textContent)
    expect(buttons.some((text) => /modifier|supprimer|enregistrer|valider|réinitialiser/i.test(text))).toBe(false)
  })

  it('A06 : « 1 à 20 sur 45 », « Précédent » désactivé en page 1, « Suivant » charge la page 2', async () => {
    searchQualifiedEmployees.mockImplementation(({ page }) =>
      Promise.resolve(pageOf([employee(`p${page}`, `NOM${page}`, 'Test')], { total: 45, page, page_count: 3 })),
    )
    const user = userEvent.setup()
    renderAt()
    await cards()

    expect(screen.getByText('1 à 1 sur 45')).toBeInTheDocument()
    expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Page 2 sur 3')).toBeInTheDocument()
    expect(within(await cards()).getByText('Test NOM2')).toBeInTheDocument()
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

  it('une seule page → pas de pagination', async () => {
    renderAt()
    await cards()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
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
