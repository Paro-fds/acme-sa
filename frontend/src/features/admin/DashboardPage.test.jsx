import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import DashboardPage from './DashboardPage.jsx'
import { getAdminMe, getEngagement, getPilotDashboard } from '../../api/admin.js'
import { claimNextCertificate } from '../../api/validation.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  getPilotDashboard: vi.fn(),
  getAdminMe: vi.fn(),
  getEngagement: vi.fn(),
}))
vi.mock('../../api/validation.js', () => ({ claimNextCertificate: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const unit = (code, label, type, employees, percent) => ({
  unit_code: code,
  unit_label: label,
  unit_type: type,
  employees_count: employees,
  complete_folders_percent: percent,
  received_certificates: 10,
  waiting_certificates: 2,
  rejected_certificates: 1,
})

const MOCK_DASHBOARD = {
  kpi: {
    active_employees: 364,
    complete_folders: 149,
    complete_folders_percent: 41,
    target_percent: 90,
    waiting_certificates: 18,
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
  to_process: { overdue_certificates: 4, error_reports: 6, to_attach: 2, applications_in_progress: 7, openings_with_applications: 3 },
  by_agency: [
    unit('SUD', 'Agence Démo Sud', 'AGENCE', 128, 40),
    unit('NORD', 'Agence Démo Nord', 'AGENCE', 142, 84),
    unit('SIEGE', 'Siège', 'AGENCE', 94, 71),
  ],
  by_region: [unit('REG_NORD', 'Région Démo Nord', 'REGION', 142, 44)],
  by_direction: [unit('DIR_EXP', 'Direction Exploitation', 'DIRECTION', 270, 42)],
}

const ME = { id: 'a1', username: 'marie', display_name: 'Marie Joseph', role: 'AGENT_RH', role_label: 'Agent RH' }
const ENGAGEMENT = {
  logins_30_days: 900,
  employees_30_days: 300,
  active_employees: 364,
  feedback: [],
  weekly_employees: [120, 140, 150, 170, 180, 190, 205, 231],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin/validation/:id" element={<p>Examen du certificat</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const ready = () => screen.findByRole('heading', { name: 'Bonjour Marie', level: 2 })

beforeEach(() => {
  vi.clearAllMocks()
  getPilotDashboard.mockResolvedValue(MOCK_DASHBOARD)
  getAdminMe.mockResolvedValue(ME)
  getEngagement.mockResolvedValue(ENGAGEMENT)
})

describe('US-132 CA-01 — en-tête', () => {
  it('bonjour, ce qui attend, « Prendre le suivant » et le bandeau illustré, sans emoji', async () => {
    renderPage()
    await ready()
    expect(screen.getByText('18 certificats attendent une décision, dont 4 en retard. Commencez par le plus ancien.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Prendre le suivant' })).toBeVisible()
    expect(screen.getByText('Des dossiers fiables, des postes pourvus en interne.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('« Prendre le suivant » prend le plus ancien et ouvre son examen', async () => {
    const user = userEvent.setup()
    claimNextCertificate.mockResolvedValue({ claimed: true, certificate_id: 'c9' })
    renderPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Prendre le suivant' }))
    expect(await screen.findByText('Examen du certificat')).toBeVisible()
  })

  it('plus rien dans la file : un message près du bouton', async () => {
    const user = userEvent.setup()
    claimNextCertificate.mockResolvedValue({ claimed: false })
    renderPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Prendre le suivant' }))
    expect(await screen.findByText('Aucun certificat en attente dans la file.')).toBeVisible()
  })

  it('rien n’attend : une phrase le dit, pas de bouton', async () => {
    getPilotDashboard.mockResolvedValue({ ...MOCK_DASHBOARD, kpi: { ...MOCK_DASHBOARD.kpi, waiting_certificates: 0, overdue_certificates: 0 } })
    renderPage()
    await ready()
    expect(screen.getByText('Aucun certificat n’attend de décision.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Prendre le suivant' })).not.toBeInTheDocument()
  })

  it('en lecture seule, pas de « Prendre le suivant »', async () => {
    getAdminMe.mockResolvedValue({ ...ME, role: 'READONLY' })
    renderPage()
    await ready()
    expect(screen.queryByRole('button', { name: 'Prendre le suivant' })).not.toBeInTheDocument()
  })
})

describe('US-132 CA-02 — les quatre tuiles', () => {
  it('chiffres et liens', async () => {
    renderPage()
    await ready()
    const tiles = screen.getByRole('region', { name: 'Chiffres clés' })
    expect(within(tiles).getAllByRole('listitem')[0]).toHaveTextContent('Employés actifs364dans 3 agences')
    expect(within(tiles).queryByRole('link', { name: /Employés actifs/ })).not.toBeInTheDocument()
    const folders = within(tiles).getByRole('link', { name: /Dossiers complets/ })
    expect(folders).toHaveTextContent('41 %149 sur 364 · objectif 90 %')
    expect(folders).toHaveAttribute('href', '/admin/employes')
    const certificates = within(tiles).getByRole('link', { name: /Certificats à décider/ })
    expect(certificates).toHaveTextContent('184 en retard')
    expect(certificates).toHaveAttribute('href', '/admin/validation')
    const reports = within(tiles).getByRole('link', { name: /Signalements à traiter/ })
    expect(reports).toHaveTextContent('6erreurs signalées par les employés')
    expect(reports).toHaveAttribute('href', '/admin/signalements')
  })

  it('une rubrique fermée au rôle n’est pas un lien', async () => {
    getAdminMe.mockResolvedValue({ ...ME, role: 'REFERENTIAL' })
    renderPage()
    await ready()
    const tiles = screen.getByRole('region', { name: 'Chiffres clés' })
    expect(within(tiles).queryByRole('link', { name: /Certificats à décider/ })).not.toBeInTheDocument()
    expect(tiles).toHaveTextContent('Certificats à décider')
  })
})

describe('US-132 CA-03 — dossiers complets par agence', () => {
  it('une barre par agence, de la plus avancée à la moins avancée, avec l’objectif ; lisible au lecteur d’écran', async () => {
    renderPage()
    await ready()
    const chart = screen.getByRole('img', { name: /Dossiers complets par agence/ })
    expect(chart).toHaveAccessibleName(
      'Dossiers complets par agence : Agence Démo Nord 84 %, Siège 71 %, Agence Démo Sud 40 %. Objectif 90 %.',
    )
    const section = screen.getByRole('region', { name: 'Dossiers complets par agence' })
    expect(section).toHaveTextContent('Objectif : 90 % des actifs au dossier complet')
  })
})

describe('US-132 CA-04 — à faire', () => {
  it('chaque ligne et son lien ; les valeurs à rattacher seulement pour le référentiel', async () => {
    renderPage()
    await ready()
    const todo = screen.getByRole('region', { name: 'À faire' })
    const links = within(todo).getAllByRole('link')
    // Libellé : `.flex-1` (l'icône fait partie du texte du lien).
    expect(links.map((link) => [link.querySelector('.flex-1').textContent, link.getAttribute('href')])).toEqual([
      ['4 certificats en retard (plus de 5 jours ouvrables)', '/admin/validation'],
      ['6 signalements d’erreur à traiter', '/admin/signalements'],
      ['7 candidatures en cours sur 3 postes', '/admin/postes'],
    ])
  })

  it('l’administrateur voit aussi les valeurs à rattacher', async () => {
    getAdminMe.mockResolvedValue({ ...ME, role: 'ADMIN' })
    renderPage()
    await ready()
    expect(within(screen.getByRole('region', { name: 'À faire' })).getByRole('link', { name: '2 valeurs à rattacher au référentiel' })).toHaveAttribute(
      'href',
      '/admin/referentiel',
    )
  })

  it('rien à faire : une phrase le dit', async () => {
    getPilotDashboard.mockResolvedValue({
      ...MOCK_DASHBOARD,
      to_process: { overdue_certificates: 0, error_reports: 0, to_attach: 0, applications_in_progress: 0, openings_with_applications: 0 },
    })
    renderPage()
    await ready()
    expect(within(screen.getByRole('region', { name: 'À faire' })).getByText('Rien d’urgent pour le moment.')).toBeVisible()
  })
})

describe('US-132 CA-05 — engagement des employés', () => {
  it('les connectés des 7 derniers jours, l’écart, la courbe des 8 semaines', async () => {
    renderPage()
    await ready()
    const engagement = await screen.findByRole('region', { name: 'Engagement des employés' })
    expect(engagement).toHaveTextContent('Employés connectés ces 7 derniers jours')
    expect(engagement).toHaveTextContent('231')
    expect(engagement).toHaveTextContent('+ 26 par rapport aux 7 jours d’avant')
    expect(within(engagement).getByRole('img', { name: /8 dernières semaines/ })).toHaveAccessibleName(
      'Employés connectés, 8 dernières semaines : 120, 140, 150, 170, 180, 190, 205, 231.',
    )
  })

  it('une baisse se dit aussi ; sans données d’engagement, le reste s’affiche', async () => {
    getEngagement.mockResolvedValue({ ...ENGAGEMENT, weekly_employees: [0, 0, 0, 0, 0, 0, 40, 30] })
    renderPage()
    await ready()
    expect(await screen.findByText('− 10 par rapport aux 7 jours d’avant')).toBeVisible()
  })

  it('l’engagement ne se charge pas : le tableau de bord reste affiché', async () => {
    getEngagement.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Indisponible.'))
    renderPage()
    await ready()
    expect(screen.queryByRole('region', { name: 'Engagement des employés' })).not.toBeInTheDocument()
  })
})

describe('US-132 CA-06 — le tableau par unité, en bas', () => {
  it('bascule entre agence, région et direction ; la répartition et « Rejetés ce mois » sont retirées', async () => {
    const user = userEvent.setup()
    renderPage()
    await ready()
    const table = screen.getByRole('table', { name: 'Par unité' })
    expect(within(table).getByText('Agence Démo Nord')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Région' }))
    expect(within(screen.getByRole('table', { name: 'Par unité' })).getByText('Région Démo Nord')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Direction' }))
    expect(within(screen.getByRole('table', { name: 'Par unité' })).getByText('Direction Exploitation')).toBeInTheDocument()
    expect(screen.queryByText('Répartition des dossiers')).not.toBeInTheDocument()
    expect(screen.queryByText('Rejetés ce mois')).not.toBeInTheDocument()
  })

  it('sans session, retour à la connexion', async () => {
    getPilotDashboard.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()
    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
