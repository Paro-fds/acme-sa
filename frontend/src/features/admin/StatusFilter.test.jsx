import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import StatusFilter, { readStatus } from './StatusFilter.jsx'
import { listEmployees } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({ listEmployees: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const employee = (id, name, status) => ({
  id,
  employee_code: `AC-${id}`,
  last_name: name,
  first_name: 'Test',
  display_name: `${name} Test`,
  previous_name: null,
  agency_code: 'PV',
  position: 'Agent',
  status,
})

const EVERYONE = [employee('1001', 'JOSEPH', 'UPDATED'), employee('1008', 'BAPTISTE', 'NOT_UPDATED'), employee('1002', 'PIERRE', 'NOT_UPDATED')]

/** Simule l'API : compteurs selon la recherche, puis filtre de statut. */
function fakeApi({ page = 1, search = '', status = '' }) {
  const found = EVERYONE.filter((item) => item.last_name.toLowerCase().includes(search.toLowerCase()))
  const updated = found.filter((item) => item.status === 'UPDATED').length
  const items = status ? found.filter((item) => item.status === status) : found
  return Promise.resolve({
    items,
    total: items.length,
    page,
    page_size: 20,
    page_count: 1,
    counts: { all: found.length, updated, not_updated: found.length - updated },
  })
}

function LocationProbe() {
  const { search } = useLocation()
  return <output aria-label="adresse">{search}</output>
}

function renderAt(path = '/admin/employes') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/employes"
          element={
            <>
              <EmployeeListPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

const chip = (name) => within(screen.getByRole('group', { name: 'Filtrer par statut' })).getByRole('button', { name })
const listedNames = () =>
  within(screen.getByRole('list', { name: 'Employés' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.font-semibold').textContent)

describe('StatusFilter (US-19)', () => {
  beforeEach(() => {
    listEmployees.mockReset()
    listEmployees.mockImplementation(fakeApi)
  })

  it('trois puces avec leur nombre, « Tous » sélectionnée par défaut', async () => {
    renderAt()
    await screen.findByText('3 employés')

    expect(chip(/^Tous/)).toHaveTextContent('Tous3')
    expect(chip(/^Effectuée/)).toHaveTextContent('Effectuée1')
    expect(chip(/^Non effectuée/)).toHaveTextContent('Non effectuée2')
    expect(chip(/^Tous/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/^Effectuée/)).toHaveAttribute('aria-pressed', 'false')
  })

  it('CA-01 : « Non effectuée » liste les employés non soumis', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('3 employés')

    await user.click(chip(/^Non effectuée/))

    expect(await screen.findByText('2 employés')).toBeInTheDocument()
    expect(listedNames()).toEqual(['BAPTISTE Test', 'PIERRE Test'])
    expect(chip(/^Non effectuée/)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?status=NOT_UPDATED')
    expect(listEmployees).toHaveBeenLastCalledWith({ page: 1, search: '', status: 'NOT_UPDATED' })
  })

  it('CA-02 : « Effectuée » liste seulement les employés soumis ; « Tous » revient à la liste complète', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('3 employés')

    await user.click(chip(/^Effectuée/))
    expect(await screen.findByText('1 employé')).toBeInTheDocument()
    expect(listedNames()).toEqual(['JOSEPH Test'])

    await user.click(chip(/^Tous/))
    expect(await screen.findByText('3 employés')).toBeInTheDocument()
    expect(screen.getByLabelText('adresse')).toHaveTextContent(/^$/)
  })

  it('CA-03 / CA-04 : combinaison avec la recherche, compteurs selon la recherche', async () => {
    renderAt('/admin/employes?search=pierre&status=NOT_UPDATED')

    expect(await screen.findByText('1 employé')).toBeInTheDocument()
    expect(listEmployees).toHaveBeenCalledWith({ page: 1, search: 'pierre', status: 'NOT_UPDATED' })
    expect(chip(/^Tous/)).toHaveTextContent('Tous1')
    expect(chip(/^Effectuée/)).toHaveTextContent('Effectuée0')
  })

  it('changer de filtre revient à la page 1 et conserve la recherche', async () => {
    const user = userEvent.setup()
    renderAt('/admin/employes?search=e&page=2')
    await screen.findByText(/employés?$/)

    await user.click(chip(/^Effectuée/))

    expect(screen.getByLabelText('adresse')).toHaveTextContent('?search=e&status=UPDATED')
  })

  it('CA-05 : ouverte avec ?status=NOT_UPDATED (lien du tableau de bord), la puce est sélectionnée', async () => {
    renderAt('/admin/employes?status=NOT_UPDATED')

    expect(await screen.findByText('2 employés')).toBeInTheDocument()
    expect(chip(/^Non effectuée/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('valeur inconnue dans l’adresse → « Tous », sans l’envoyer à l’API', async () => {
    renderAt('/admin/employes?status=DRAFT')

    expect(await screen.findByText('3 employés')).toBeInTheDocument()
    expect(chip(/^Tous/)).toHaveAttribute('aria-pressed', 'true')
    expect(listEmployees).toHaveBeenCalledWith({ page: 1, search: '', status: '' })
  })

  it('aucun employé avec ce statut → message', async () => {
    listEmployees.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      page_count: 1,
      counts: { all: 3, updated: 0, not_updated: 3 },
    })
    renderAt('/admin/employes?status=UPDATED')

    expect(await screen.findByText('Aucun employé avec ce statut.')).toBeInTheDocument()
  })

  it('aucune mention de brouillon', async () => {
    renderAt()
    await screen.findByText('3 employés')

    expect(screen.queryByText(/brouillon|en cours/i)).not.toBeInTheDocument()
  })
})

describe('StatusFilter (composant seul)', () => {
  it('sans compteurs (premier chargement), les puces restent utilisables', async () => {
    const onChange = vi.fn()
    render(<StatusFilter value="" counts={null} onChange={onChange} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Effectuée' }))

    expect(onChange).toHaveBeenCalledWith('UPDATED')
  })

  it('toucher la puce déjà sélectionnée ne fait rien', async () => {
    const onChange = vi.fn()
    render(<StatusFilter value="UPDATED" counts={null} onChange={onChange} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Effectuée' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('readStatus : seules UPDATED et NOT_UPDATED sont acceptées', () => {
    expect(readStatus(new URLSearchParams('status=UPDATED'))).toBe('UPDATED')
    expect(readStatus(new URLSearchParams('status=NOT_UPDATED'))).toBe('NOT_UPDATED')
    expect(readStatus(new URLSearchParams('status=updated'))).toBe('')
    expect(readStatus(new URLSearchParams(''))).toBe('')
  })
})
