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

  it('CA-01 & CA-03 : applique les filtres Niveau validé, Domaine et Région', async () => {
    const user = userEvent.setup()
    renderAt()

    // Sélectionner Niveau validé
    const levelSelect = screen.getByLabelText('Niveau validé')
    await user.selectOptions(levelSelect, 'au moins Licence')

    expect(searchQualifiedEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        minLevel: 'au moins Licence',
      }),
    )

    // Vérifier l'affichage du badge de filtre actif
    expect(await screen.findByText('Niveau validé : au moins Licence')).toBeInTheDocument()

    // Vérifier le tableau A06 avec les colonnes Niveau validé et Domaine
    const table = screen.getByRole('table', { name: 'Employés' })
    expect(within(table).getByText('Paul Démo')).toBeInTheDocument()
    expect(within(table).getByText('Licence')).toBeInTheDocument()
    expect(within(table).getByText('Comptabilité')).toBeInTheDocument()
    expect(within(table).getByText('Dossier complet')).toBeInTheDocument()
  })

  it('CA-03 : permet de supprimer un filtre actif ou de tout effacer', async () => {
    const user = userEvent.setup()
    renderAt('/admin/employes?min_level=au+moins+Licence&domain=Comptabilit%C3%A9')

    expect(await screen.findByText('Niveau validé : au moins Licence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Supprimer le filtre Domaine/ })).toBeInTheDocument()

    // Cliquer sur Tout effacer
    const clearAll = screen.getByRole('button', { name: 'Tout effacer' })
    await user.click(clearAll)

    expect(screen.queryByText('Niveau validé : au moins Licence')).not.toBeInTheDocument()
  })

  it('US-603 CA-01 : propose l’export CSV et Excel avec les filtres actifs', async () => {
    const user = userEvent.setup()
    renderAt('/admin/employes?min_level=au+moins+Licence&domain=Comptabilit%C3%A9')

    const exportBtn = screen.getByRole('button', { name: /Exporter \(Excel, CSV\)/ })
    await user.click(exportBtn)

    const csvLink = screen.getByRole('link', { name: /Exporter en CSV/ })
    const xlsxLink = screen.getByRole('link', { name: /Exporter en Excel/ })

    expect(csvLink).toHaveAttribute('href', expect.stringContaining('format=csv'))
    expect(csvLink).toHaveAttribute('href', expect.stringContaining('min_level='))
    expect(xlsxLink).toHaveAttribute('href', expect.stringContaining('format=xlsx'))
  })
})
