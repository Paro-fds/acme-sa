import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import DashboardPage from './DashboardPage.jsx'
import { getPilotDashboard } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  getPilotDashboard: vi.fn(),
}))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const MOCK_DASHBOARD = {
  kpi: {
    active_employees: 364,
    complete_folders: 149,
    complete_folders_percent: 41,
    target_percent: 90,
    waiting_certificates: 27,
    overdue_certificates: 4,
    rejected_this_month: 6,
  },
  distribution: {
    incomplete_profile_count: 127,
    incomplete_profile_percent: 35,
    complete_profile_count: 88,
    complete_profile_percent: 24,
    complete_folder_count: 149,
    complete_folder_percent: 41,
  },
  to_process: {
    overdue_certificates: 4,
    error_reports: 9,
    to_attach: 2,
  },
  by_agency: [
    {
      unit_code: 'NORD',
      unit_label: 'Agence Démo Nord',
      unit_type: 'AGENCE',
      employees_count: 142,
      complete_folders_percent: 44,
      received_certificates: 98,
      waiting_certificates: 11,
      rejected_certificates: 2,
    },
    {
      unit_code: 'SUD',
      unit_label: 'Agence Démo Sud',
      unit_type: 'AGENCE',
      employees_count: 128,
      complete_folders_percent: 40,
      received_certificates: 76,
      waiting_certificates: 9,
      rejected_certificates: 3,
    },
  ],
  by_region: [
    {
      unit_code: 'REG_NORD',
      unit_label: 'Région Démo Nord',
      unit_type: 'REGION',
      employees_count: 142,
      complete_folders_percent: 44,
      received_certificates: 98,
      waiting_certificates: 11,
      rejected_certificates: 2,
    },
  ],
  by_direction: [
    {
      unit_code: 'DIR_EXP',
      unit_label: 'Direction Exploitation',
      unit_type: 'DIRECTION',
      employees_count: 270,
      complete_folders_percent: 42,
      received_certificates: 174,
      waiting_certificates: 20,
      rejected_certificates: 5,
    },
  ],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin/validation" element={<p>File de validation</p>} />
        <Route path="/admin/signalements" element={<p>Signalements</p>} />
        <Route path="/admin/referentiel" element={<p>À rattacher</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage (US-601)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPilotDashboard.mockResolvedValue(MOCK_DASHBOARD)
  })

  it('CA-01 : Affiche les 4 cartes KPI, la barre empilée et les liens À traiter', async () => {
    renderPage()

    // En-tête
    const headings = await screen.findAllByRole('heading', { name: 'Tableau de bord' })
    expect(headings.length).toBeGreaterThan(0)

    // KPI 1 : Employés actifs 364
    expect(screen.getByText('364')).toBeInTheDocument()

    // KPI 2 : Dossiers complets 41 %
    expect(screen.getAllByText('41 %').length).toBeGreaterThan(0)
    expect(screen.getByText('(149 sur 364)')).toBeInTheDocument()
    expect(screen.getByText('Objectif : 90 %')).toBeInTheDocument()

    // KPI 3 : Certificats en attente 27 dont 4 en retard
    expect(screen.getAllByText('27').length).toBeGreaterThan(0)
    expect(screen.getByText('4 en retard (plus de 5 jours ouvrables)')).toBeInTheDocument()

    // KPI 4 : Rejetés ce mois 6
    expect(screen.getByText('6')).toBeInTheDocument()

    // Répartition
    expect(screen.getByText('Profil incomplet 127 (35 %)')).toBeInTheDocument()
    expect(screen.getByText('Profil complet 88 (24 %)')).toBeInTheDocument()
    expect(screen.getByText('Dossier complet 149 (41 %)')).toBeInTheDocument()

    // Section À traiter
    expect(screen.getByText(/4 certificats en retard → File de validation/)).toBeInTheDocument()
    expect(screen.getByText(/9 signalements d'erreur → Signalements/)).toBeInTheDocument()
    expect(screen.getByText(/2 valeurs à rattacher → À rattacher/)).toBeInTheDocument()
  })

  it('CA-02 : Bascule entre les onglets Agence, Région et Direction', async () => {
    const user = userEvent.setup()
    renderPage()

    // Par défaut, onglet Agence actif
    expect(await screen.findByText('Agence Démo Nord')).toBeInTheDocument()
    expect(screen.getByText('Agence Démo Sud')).toBeInTheDocument()

    // Clic sur Région
    await user.click(screen.getByRole('button', { name: 'Région' }))
    expect(await screen.findByText('Région Démo Nord')).toBeInTheDocument()

    // Clic sur Direction
    await user.click(screen.getByRole('button', { name: 'Direction' }))
    expect(await screen.findByText('Direction Exploitation')).toBeInTheDocument()
  })

  it('Gestion des erreurs et non authentifié', async () => {
    getPilotDashboard.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
