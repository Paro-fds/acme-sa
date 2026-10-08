import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AdminLoginPage from './AdminLoginPage.jsx'
import EmployeeListPage from './EmployeeListPage.jsx'
import { adminLogin, adminLogout } from '../../api/auth.js'
import { getAdminMe, listEmployees } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/auth.js', () => ({ adminLogin: vi.fn(), adminLogout: vi.fn(), logout: vi.fn() }))
vi.mock('../../api/admin.js', () => ({ getAdminMe: vi.fn(), listEmployees: vi.fn() }))

const INVALID = new ApiError(401, 'INVALID_CREDENTIALS', 'Identifiant ou mot de passe incorrect.')
const LOCKED = new ApiError(423, 'ACCOUNT_LOCKED', 'Trop de tentatives. Réessayez dans 15 minutes.')

function renderAt(path, state) {
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/admin/connexion" element={<AdminLoginPage />} />
        <Route path="/admin" element={<p>Tableau de bord</p>} />
        <Route path="/admin/mot-de-passe" element={<p>Choix du mot de passe</p>} />
        <Route path="/admin/double-authentification" element={<p>Double authentification</p>} />
        <Route path="/admin/employes" element={<EmployeeListPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user, username = 'admin', password = 'Admin-Test-2026') {
  await user.type(screen.getByLabelText('Identifiant'), username)
  await user.type(screen.getByLabelText('Mot de passe'), password)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('AdminLoginPage (US-15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminMe.mockResolvedValue({ id: 'a1', username: 'admin', must_change_password: false })
  })

  it('US-23 CA-07 : mot de passe provisoire → écran de choix du mot de passe', async () => {
    adminLogin.mockResolvedValue(null)
    getAdminMe.mockResolvedValue({ id: 'a2', username: 'marie.pierre', must_change_password: true })
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user, 'marie.pierre', 'Provisoire-2026!')

    expect(await screen.findByText('Choix du mot de passe')).toBeInTheDocument()
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument()
  })

  it('le bouton reste inactif tant que l’identifiant et le mot de passe ne sont pas saisis', async () => {
    const user = userEvent.setup()
    renderAt('/admin/connexion')
    const submit = screen.getByRole('button', { name: 'Se connecter' })

    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Identifiant'), 'admin')
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Mot de passe'), 'x')
    expect(submit).toBeEnabled()
  })

  it('CA-01 : identifiants corrects → tableau de bord', async () => {
    adminLogin.mockResolvedValue(null)
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user, ' admin ')

    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
    expect(adminLogin).toHaveBeenCalledWith('admin', 'Admin-Test-2026')
  })

  it('CA-02 : identifiants incorrects → message sans préciser lequel, mot de passe effacé', async () => {
    adminLogin.mockRejectedValue(INVALID)
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user, 'admin', 'mauvais')

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiant ou mot de passe incorrect.')
    expect(screen.getByLabelText('Identifiant')).toHaveValue('admin')
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
  })

  it('CA-03 : compte bloqué → message du serveur', async () => {
    adminLogin.mockRejectedValue(LOCKED)
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives. Réessayez dans 15 minutes.')
  })

  it('le mot de passe peut être affiché', async () => {
    const user = userEvent.setup()
    renderAt('/admin/connexion')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret')

    await user.click(screen.getByRole('button', { name: 'Afficher : Mot de passe' }))

    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text')
  })

  it('CA-05 : route admin sans session → retour à /admin/connexion', async () => {
    listEmployees.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderAt('/admin/employes')

    expect(await screen.findByRole('heading', { name: 'Connexion administrateur' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Vous devez être connecté.')
  })

  it('CA-07 : session expirée → retour à la connexion avec le message', async () => {
    listEmployees.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.'))
    renderAt('/admin/employes')

    expect(await screen.findByRole('alert')).toHaveTextContent('Votre session a expiré. Reconnectez-vous.')
  })

  it('CA-06 : « Se déconnecter » ferme la session admin et revient à /admin/connexion', async () => {
    listEmployees.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
    adminLogout.mockResolvedValue(null)
    const user = userEvent.setup()
    renderAt('/admin/employes')

    await user.click(await screen.findByRole('button', { name: 'Menu du compte' }))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('heading', { name: 'Connexion administrateur' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Vous êtes déconnecté.')
    expect(adminLogout).toHaveBeenCalledOnce()
  })

  it('US-102 : mot de passe vérifié, second facteur attendu → écran de double authentification', async () => {
    adminLogin.mockResolvedValue({ mfa: { enrolled: false, method: null, destination: null }, code: null })
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user)

    expect(await screen.findByText('Double authentification')).toBeInTheDocument()
    expect(getAdminMe).not.toHaveBeenCalled()
  })

  it('US-102 : écran RH ouvert sans le code → retour à la double authentification', async () => {
    listEmployees.mockRejectedValue(new ApiError(401, 'MFA_REQUIRED', 'Saisissez votre code de vérification pour continuer.'))
    renderAt('/admin/employes')

    expect(await screen.findByText('Double authentification')).toBeInTheDocument()
  })
})
