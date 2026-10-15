import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AdminAccountsPage from './AdminAccountsPage.jsx'
import { listAdmins, setAdminStatus, listEmployees, resetAccess } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({
  addAdmin: vi.fn(),
  changeAdminRole: vi.fn(),
  deleteAdmin: vi.fn(),
  listAdmins: vi.fn(),
  setAdminStatus: vi.fn(),
  listEmployees: vi.fn(),
  resetAccess: vi.fn(),
}))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))
vi.mock('../../api/mfa.js', () => ({ resetAdminMfa: vi.fn() }))

const ME = {
  id: 'a1',
  username: 'admin.demo',
  full_name: 'Administrateur Démo',
  email: 'admin.demo@domaine-demo.local',
  employee_id: 'EMP-0001',
  role: 'ADMIN',
  role_label: 'Administrateur',
  created_at: '2026-10-01T08:00:00Z',
  created_by: null,
  last_login_at: '2026-10-07T08:30:00Z',
  must_change_password: false,
  is_active: true,
  is_me: true,
}

const AGENT1 = {
  id: 'a2',
  username: 'agent1.demo',
  full_name: 'Agent RH Démo 1',
  email: 'agent1.demo@domaine-demo.local',
  employee_id: 'EMP-0002',
  role: 'AGENT_RH',
  role_label: 'Agent RH',
  created_at: '2026-10-02T10:00:00Z',
  created_by: 'admin.demo',
  last_login_at: '2026-10-06T14:05:00Z',
  must_change_password: false,
  is_active: true,
  is_me: false,
}

const LECTURE = {
  id: 'a3',
  username: 'lecture.demo',
  full_name: 'Lecture Démo',
  email: 'lecture.demo@domaine-demo.local',
  employee_id: 'EMP-0005',
  role: 'READONLY',
  role_label: 'Lecture seule',
  created_at: '2026-09-10T10:00:00Z',
  created_by: 'admin.demo',
  last_login_at: '2026-09-15T16:40:00Z',
  must_change_password: false,
  is_active: false,
  is_me: false,
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/administrateurs']}>
      <Routes>
        <Route path="/admin/administrateurs" element={<AdminAccountsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-104 & Écran A10 : Comptes et rôles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAdmins.mockResolvedValue([ME, AGENT1, LECTURE])
    listEmployees.mockResolvedValue({
      items: [
        {
          id: 'emp-418',
          employee_code: 'EMP-0418',
          display_name: 'Lucie Exemple',
          agency_code: 'Agence Démo Nord',
        },
      ],
      total: 1,
    })
  })

  it('affiche les informations A10 : Nom, Email, Matricule, Rôle et Statut (Actif / Désactivé)', async () => {
    renderPage()

    expect(await screen.findByText('3 comptes')).toBeInTheDocument()
    expect(screen.getByText(/Administrateur Démo/)).toBeInTheDocument()
    expect(screen.getByText('admin.demo@domaine-demo.local')).toBeInTheDocument()
    expect(screen.getByText(/EMP-0001/)).toBeInTheDocument()

    expect(screen.getByText(/Agent RH Démo 1/)).toBeInTheDocument()
    expect(screen.getByText(/EMP-0002/)).toBeInTheDocument()

    // Badges de statut
    expect(screen.getAllByText('Actif').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Désactivé')).toBeInTheDocument()
  })

  it('CA-02 : un administrateur peut désactiver un compte RH actif après confirmation', async () => {
    setAdminStatus.mockResolvedValue({ ...AGENT1, is_active: false })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('3 comptes')
    const agentItem = screen.getByText(/Agent RH Démo 1/).closest('li')
    const deactivateBtn = within(agentItem).getByRole('button', { name: 'Désactiver le compte' })

    await user.click(deactivateBtn)
    expect(within(agentItem).getByRole('alertdialog')).toBeInTheDocument()

    const confirmBtn = within(agentItem).getByRole('button', { name: 'Désactiver' })
    await user.click(confirmBtn)

    expect(setAdminStatus).toHaveBeenCalledWith('a2', false)
  })

  it('CA-02 : un administrateur peut réactiver un compte RH désactivé', async () => {
    setAdminStatus.mockResolvedValue({ ...LECTURE, is_active: true })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('3 comptes')
    const lectureItem = screen.getByText(/Lecture Démo/).closest('li')
    const activateBtn = within(lectureItem).getByRole('button', { name: 'Réactiver le compte' })

    await user.click(activateBtn)
    expect(setAdminStatus).toHaveBeenCalledWith('a3', true)
  })

  it('CA-01 & A10 : Section Accès des employés permet de rechercher et réinitialiser son accès', async () => {
    resetAccess.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('3 comptes')

    // Recherche d'un employé
    const searchInput = screen.getByLabelText('Rechercher un employé (nom ou matricule)')
    await user.clear(searchInput)
    await user.type(searchInput, 'Lucie')

    expect(listEmployees).toHaveBeenCalledWith({ search: 'Lucie', page: 1, pageSize: 5 })

    // Résultat affiché : Lucie Exemple · EMP-0418 · Agence Démo Nord
    expect(await screen.findByText('Lucie Exemple · EMP-0418 · Agence Démo Nord')).toBeInTheDocument()

    // Clic sur Réinitialiser son accès
    const resetBtn = await screen.findByRole('button', { name: 'Réinitialiser son accès' })
    await user.click(resetBtn)

    // Dialogue de confirmation
    const confirmBtn = await screen.findByRole('button', { name: 'Confirmer' })
    await user.click(confirmBtn)

    expect(resetAccess).toHaveBeenCalledWith('emp-418')
    expect(await screen.findByText(/Accès de « Lucie Exemple » réinitialisé avec succès/)).toBeInTheDocument()
  })
})
