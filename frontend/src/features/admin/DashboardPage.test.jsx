import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import DashboardPage from './DashboardPage.jsx'
import { getStatistics } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  getStatistics: vi.fn(),
  getEngagement: vi.fn(() =>
    Promise.resolve({ logins_30_days: 0, employees_30_days: 0, active_employees: 7, feedback: [] }),
  ),
}))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

function ListProbe() {
  const { search } = useLocation()
  return <p>Liste des employés {search}</p>
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin/employes" element={<ListProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const STATISTICS = { total: 7, updated: 1, not_updated: 6, progress: 14 }

describe('DashboardPage (US-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStatistics.mockResolvedValue(STATISTICS)
  })

  it('CA-01 : trois cartes et la progression de la campagne', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /^Total : 7,/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Effectuées : 1,/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Non effectuées : 6,/ })).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Avancement de la campagne' })
    expect(bar).toHaveAttribute('aria-valuenow', '14')
    expect(screen.getByText('14 % de la campagne')).toBeInTheDocument()
  })

  it('CA-02 : aucune mention de brouillon', async () => {
    renderPage()
    await screen.findByText('14 % de la campagne')

    expect(screen.queryByText(/brouillon|en cours/i)).not.toBeInTheDocument()
  })

  it('CA-04 : campagne non démarrée → 0 % sans erreur', async () => {
    getStatistics.mockResolvedValue({ total: 7, updated: 0, not_updated: 7, progress: 0 })
    renderPage()

    expect(await screen.findByText('0 % de la campagne')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CA-05 : « Actualiser » recharge les chiffres', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('14 % de la campagne')
    getStatistics.mockResolvedValue({ total: 7, updated: 2, not_updated: 5, progress: 29 })

    await user.click(screen.getByRole('button', { name: 'Actualiser' }))

    expect(await screen.findByText('29 % de la campagne')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Non effectuées : 5,/ })).toBeInTheDocument()
    expect(getStatistics).toHaveBeenCalledTimes(2)
  })

  it('CA-06 : la carte « Non effectuées » ouvre la liste filtrée', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('link', { name: /Non effectuées/ }))

    expect(await screen.findByText('Liste des employés ?status=NOT_UPDATED')).toBeInTheDocument()
  })

  it('CA-06 : « Effectuées » et « Total » mènent à la liste filtrée ou complète', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /^Effectuées/ })).toHaveAttribute('href', '/admin/employes?status=UPDATED')
    expect(screen.getByRole('link', { name: /Total/ })).toHaveAttribute('href', '/admin/employes')
  })

  it('sans session → connexion admin', async () => {
    getStatistics.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })

  it('erreur serveur → message', async () => {
    getStatistics.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur.'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur.')
  })
})
