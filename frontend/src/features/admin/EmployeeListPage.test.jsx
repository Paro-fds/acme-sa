import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import { listEmployees } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({ listEmployees: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const employee = (id, last_name, first_name, overrides = {}) => ({
  id,
  employee_code: `AC-${id}`,
  last_name,
  first_name,
  display_name: `${last_name} ${first_name}`,
  previous_name: null,
  agency_code: 'PV',
  position: 'Agent de crédit',
  status: 'NOT_UPDATED',
  ...overrides,
})

const JOSEPH = employee('1001', 'JOSEPH-PAUL', 'Jean', { previous_name: 'JOSEPH', status: 'UPDATED' })
const BAPTISTE = employee('1008', 'BAPTISTE', 'Marc')

const pageOf = (items, { total = items.length, page = 1, page_count = 1 } = {}) => ({
  items,
  total,
  page,
  page_size: 20,
  page_count,
})

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

describe('EmployeeListPage (US-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEmployees.mockResolvedValue(pageOf([BAPTISTE, JOSEPH], { total: 7 }))
  })

  it('CA-01 : nombre d’employés, cartes avec nom, matricule, agence et statut', async () => {
    renderAt()

    const list = await cards()
    expect(screen.getByText('7 employés')).toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link').getAttribute('href'))).toEqual([
      '/admin/employes/1008',
      '/admin/employes/1001',
    ])
    expect(within(items[0]).getByText('BAPTISTE Marc')).toBeInTheDocument()
    expect(within(items[0]).getByText(/AC-1008/)).toBeInTheDocument()
    expect(within(items[0]).getByText(/Agence PV/)).toBeInTheDocument()
    expect(within(items[0]).getByText('Mise à jour non effectuée')).toBeInTheDocument()
    expect(within(items[1]).getByText('Mise à jour effectuée')).toBeInTheDocument()
  })

  it('CA-01 : le tableau reprend les mêmes colonnes', async () => {
    renderAt()
    await cards()

    const headers = within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Nom', 'Matricule', 'Agence', 'Poste', 'Statut', 'Ouvrir'])
    const rows = within(table()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[1]).getByRole('link', { name: /JOSEPH-PAUL Jean/ })).toHaveAttribute('href', '/admin/employes/1001')
    expect(within(rows[1]).getByText('Mise à jour effectuée')).toBeInTheDocument()
  })

  it('CA-01 : un seul employé → « 1 employé »', async () => {
    listEmployees.mockResolvedValue(pageOf([BAPTISTE]))
    renderAt()

    expect(await screen.findByText('1 employé')).toBeInTheDocument()
  })

  it('CA-03 : nouveau nom en principal, « anciennement … » en dessous', async () => {
    renderAt()

    const item = within(await cards()).getAllByRole('listitem')[1]
    expect(within(item).getByText('JOSEPH-PAUL Jean')).toBeInTheDocument()
    expect(within(item).getByText('anciennement JOSEPH')).toHaveClass('text-muted')
    expect(within(table()).getByText('anciennement JOSEPH')).toBeInTheDocument()
    expect(screen.queryByText('anciennement BAPTISTE')).not.toBeInTheDocument()
  })

  it('CA-05 : toucher une carte ouvre le dossier', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(within(await cards()).getByRole('link', { name: /JOSEPH-PAUL Jean/ }))

    expect(await screen.findByText('Dossier 1001')).toBeInTheDocument()
  })

  it('CA-05 : cliquer une ligne du tableau ouvre le dossier', async () => {
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
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('CA-02 : pagination — « Précédent » désactivé en page 1, « Suivant » charge la page 2', async () => {
    listEmployees.mockImplementation(({ page }) =>
      Promise.resolve(pageOf([employee(`p${page}`, `NOM${page}`, 'Test')], { total: 45, page, page_count: 3 })),
    )
    const user = userEvent.setup()
    renderAt()
    await cards()

    expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Page 2 sur 3')).toBeInTheDocument()
    expect(within(await cards()).getByText('NOM2 Test')).toBeInTheDocument()
    expect(listEmployees).toHaveBeenLastCalledWith({ page: 2 })
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?page=2')
  })

  it('CA-02 : « Suivant » désactivé sur la dernière page (lue dans l’URL)', async () => {
    listEmployees.mockResolvedValue(pageOf([BAPTISTE], { total: 45, page: 3, page_count: 3 }))
    renderAt('/admin/employes?page=3')
    await cards()

    expect(listEmployees).toHaveBeenCalledWith({ page: 3 })
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeEnabled()
  })

  it('CA-02 : une seule page → pas de pagination', async () => {
    renderAt()
    await cards()

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('la pagination conserve les autres paramètres de l’adresse (filtre US-19)', async () => {
    listEmployees.mockResolvedValue(pageOf([BAPTISTE], { total: 45, page: 1, page_count: 3 }))
    const user = userEvent.setup()
    renderAt('/admin/employes?status=NOT_UPDATED')
    await cards()

    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByLabelText('adresse')).toHaveTextContent('?status=NOT_UPDATED&page=2')
  })

  it('page invalide dans l’adresse → page 1', async () => {
    renderAt('/admin/employes?page=abc')
    await cards()

    expect(listEmployees).toHaveBeenCalledWith({ page: 1 })
  })

  it('aucun employé → message', async () => {
    listEmployees.mockResolvedValue(pageOf([]))
    renderAt()

    expect(await screen.findByText('Aucun employé à afficher.')).toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    listEmployees.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderAt()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
