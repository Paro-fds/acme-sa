import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import { listEmployees, searchQualifiedEmployees } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({
  listEmployees: vi.fn(),
  searchQualifiedEmployees: vi.fn(),
  getEmployeesExportUrl: vi.fn(
    ({ minLevel = '', format = 'csv' } = {}) =>
      `/api/admin/employees/export?format=${format}&min_level=${encodeURIComponent(minLevel)}`,
  ),
}))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const qualifiedEmployee = (id, overrides = {}) => ({
  id,
  employee_code: `EMP-${id}`,
  last_name: 'DEMO',
  first_name: 'Paul',
  display_name: 'Paul DEMO',
  agency_code: 'SUD',
  agency_name: 'Agence Démo Sud',
  region_code: 'REG-1',
  region_name: 'Région Démo 1',
  direction_code: 'DIR-OPS',
  direction_name: 'Direction Démo des Opérations',
  position: 'Analyste crédit',
  folder_status: 'FOLDER_COMPLETE',
  folder_status_label: 'Dossier complet',
  validated_level: 'LICENCE',
  validated_level_label: 'Licence',
  validated_rank: 6,
  validated_domain: 'COMPTABILITE',
  validated_domain_label: 'Comptabilité',
  updated_at: '2026-10-02T10:00:00Z',
  ...overrides,
})

function renderAt(path = '/admin/employes') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/employes" element={<EmployeeListPage />} />
        <Route path="/admin/employes/:id" element={<p>Dossier ouvert</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-602 — Trouver les employés qualifiés en une minute (Écran A06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEmployees.mockResolvedValue({ items: [], total: 0, page: 1, page_count: 1 })
    searchQualifiedEmployees.mockResolvedValue({
      items: [
        qualifiedEmployee('0204', {
          display_name: 'Paul Démo',
          position: 'Analyste crédit',
          validated_level_label: 'Licence',
          validated_domain_label: 'Comptabilité',
        }),
      ],
      total: 1,
    })
  })

  it('CA-01 & CA-03 : applique les filtres Niveau validé minimum et Domaine', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.selectOptions(screen.getByLabelText('Niveau validé minimum'), 'Licence')
    expect(searchQualifiedEmployees).toHaveBeenCalledWith(expect.objectContaining({ minLevel: 'LICENCE' }))
    expect(await screen.findByRole('button', { name: 'Retirer le filtre Licence et plus' })).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Employés' })
    expect(within(table).getByText('Paul Démo')).toBeInTheDocument()
    expect(within(table).getByText('Licence · Comptabilité')).toBeInTheDocument()
    expect(within(table).getByText('Dossier complet')).toBeInTheDocument()
  })

  it('CA-03 : permet de retirer un filtre actif ou de tout effacer', async () => {
    const user = userEvent.setup()
    renderAt('/admin/employes?min_level=LICENCE&domain=Comptabilit%C3%A9')

    expect(await screen.findByRole('button', { name: 'Retirer le filtre Licence et plus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer le filtre Comptabilité' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(screen.queryByRole('button', { name: /Retirer le filtre/ })).not.toBeInTheDocument()
  })

  it('US-603 CA-01 : « Exporter la liste » télécharge l’Excel avec les filtres actifs', async () => {
    renderAt('/admin/employes?min_level=LICENCE&domain=Comptabilit%C3%A9')

    const exportLink = await screen.findByRole('link', { name: 'Exporter la liste' })
    expect(exportLink).toHaveAttribute('href', expect.stringContaining('format=xlsx'))
    expect(exportLink).toHaveAttribute('href', expect.stringContaining('min_level=LICENCE'))
  })
})
