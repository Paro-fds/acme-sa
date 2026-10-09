import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AdminLoginPage from './AdminLoginPage.jsx'
import EmployeeListPage from './EmployeeListPage.jsx'
import { adminLogin, adminLogout } from '../../api/auth.js'
import { getAdminMe, listEmployees } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'
import { loginMfa } from '../../api/mfa.js'

vi.mock('../../api/auth.js', () => ({ adminLogin: vi.fn(), adminLogout: vi.fn(), logout: vi.fn() }))
vi.mock('../../api/admin.js', () => ({ getAdminMe: vi.fn(), listEmployees: vi.fn() }))
vi.mock('../../api/mfa.js', () => ({
  loginMfa: { status: vi.fn(), start: vi.fn(), confirm: vi.fn(), resend: vi.fn(), verify: vi.fn() },
}))

const INVALID = new ApiError(401, 'INVALID_CREDENTIALS', 'Identifiant ou mot de passe incorrect.')
const LOCKED = new ApiError(423, 'ACCOUNT_LOCKED', 'Trop de tentatives. Réessayez dans 15 minutes.')
const TOTP_STEP = { mfa: { enrolled: true, method: 'TOTP', destination: null }, code: null }
const WHATSAPP_STEP = {
  mfa: { enrolled: true, method: 'WHATSAPP', destination: '+509 •••• 1111' },
  code: { method: 'WHATSAPP', destination: '+509 •••• 1111', local_code: '482913' },
}

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
  await user.click(screen.getByRole('button', { name: 'Continuer' }))
}

describe('AdminLoginPage (US-15, US-107)', () => {
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
    const submit = screen.getByRole('button', { name: 'Continuer' })

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

    expect(await screen.findByRole('heading', { level: 1, name: 'Espace RH' })).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { level: 1, name: 'Espace RH' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Vous êtes déconnecté.')
    expect(adminLogout).toHaveBeenCalledOnce()
  })

  it('US-107 CA-01 : écran A01, carte « Espace RH » avec le logo, deux étapes et la mention du réseau', () => {
    renderAt('/admin/connexion')

    expect(screen.getByRole('heading', { level: 1, name: 'Espace RH' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'ACME SA' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Identifiants/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Vérification de sécurité/ })).toBeInTheDocument()
    expect(screen.getByText("Espace réservé au réseau de l'institution ou au VPN.")).toBeInTheDocument()
    expect(screen.queryByLabelText('Code de vérification')).not.toBeInTheDocument()
  })

  it('US-107 CA-02, CA-03 : mot de passe vérifié → le code se saisit sur la même carte, « Valider » ouvre l’espace RH', async () => {
    adminLogin.mockResolvedValue(TOTP_STEP)
    loginMfa.verify.mockResolvedValue(null)
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user, 'rh.demo')

    const code = await screen.findByLabelText('Code de vérification')
    expect(screen.getByRole('heading', { level: 1, name: 'Espace RH' })).toBeInTheDocument()
    expect(screen.getByText('rh.demo')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
    expect(getAdminMe).not.toHaveBeenCalled()
    await user.type(code, '482913')
    expect(screen.getByTestId('code-boxes')).toHaveTextContent('482913')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(loginMfa.verify).toHaveBeenCalledWith('482913')
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it('US-107 CA-03 : un code collé remplit les 6 cases', async () => {
    adminLogin.mockResolvedValue(TOTP_STEP)
    const user = userEvent.setup()
    renderAt('/admin/connexion')
    await fillAndSubmit(user)

    await user.click(await screen.findByLabelText('Code de vérification'))
    await user.paste('482 913')

    expect(screen.getByLabelText('Code de vérification')).toHaveValue('482913')
    expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled()
  })

  it('US-107 CA-04 : « Renvoyer le code » seulement pour un code envoyé (WhatsApp, email)', async () => {
    adminLogin.mockResolvedValueOnce(TOTP_STEP).mockResolvedValueOnce(WHATSAPP_STEP)
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user)
    await screen.findByLabelText('Code de vérification')
    expect(screen.queryByRole('button', { name: 'Renvoyer le code' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: "Changer d'identifiant" }))
    await user.type(screen.getByLabelText('Mot de passe'), 'Admin-Test-2026')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(await screen.findByRole('button', { name: 'Renvoyer le code' })).toBeInTheDocument()
  })

  it('US-107 CA-05 : « Mot de passe oublié ? » renvoie vers un Administrateur', async () => {
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }))

    expect(screen.getByRole('status')).toHaveTextContent('Demandez à un Administrateur de réinitialiser votre accès.')
  })

  it('US-107 CA-06 : première connexion → « Protégez votre compte » sur la même carte', async () => {
    adminLogin.mockResolvedValue({
      mfa: { enrolled: false, method: null, destination: null, available_methods: ['TOTP'] },
      code: null,
    })
    const user = userEvent.setup()
    renderAt('/admin/connexion')

    await fillAndSubmit(user)

    expect(await screen.findByRole('heading', { name: 'Protégez votre compte' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Application d'authentification/ })).toBeEnabled()
    expect(screen.getByRole('radio', { name: /WhatsApp/ })).toBeDisabled()
    expect(getAdminMe).not.toHaveBeenCalled()
  })

  it('US-107 : « Changer d’identifiant » revient à l’étape 1', async () => {
    adminLogin.mockResolvedValue(TOTP_STEP)
    const user = userEvent.setup()
    renderAt('/admin/connexion')
    await fillAndSubmit(user, 'rh.demo')

    await user.click(await screen.findByRole('button', { name: "Changer d'identifiant" }))

    expect(screen.getByLabelText('Identifiant')).toHaveValue('rh.demo')
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
    expect(screen.queryByLabelText('Code de vérification')).not.toBeInTheDocument()
  })

  it('US-102 : écran RH ouvert sans le code → retour à la double authentification', async () => {
    listEmployees.mockRejectedValue(new ApiError(401, 'MFA_REQUIRED', 'Saisissez votre code de vérification pour continuer.'))
    renderAt('/admin/employes')

    expect(await screen.findByText('Double authentification')).toBeInTheDocument()
  })
})
