import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AdminPasswordPage, { PASSWORD_CHANGED } from './AdminPasswordPage.jsx'
import { changeMyAdminPassword, getAdminMe } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({ changeMyAdminPassword: vi.fn(), getAdminMe: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const PROVISIONAL = { id: 'a2', username: 'marie.pierre', must_change_password: true }
const REGULAR = { id: 'a1', username: 'admin', must_change_password: false }

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/mot-de-passe']}>
      <Routes>
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin" element={<p>Tableau de bord</p>} />
        <Route path="/admin/mot-de-passe" element={<AdminPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fill(user, current, next, confirmation = next) {
  await user.type(screen.getByLabelText(/^Mot de passe (provisoire|actuel)$/), current)
  await user.type(screen.getByLabelText('Nouveau mot de passe'), next)
  await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))
}

describe('AdminPasswordPage (US-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    changeMyAdminPassword.mockResolvedValue(null)
  })

  it('CA-07 : mot de passe provisoire → « Choisissez votre mot de passe », sans retour possible', async () => {
    getAdminMe.mockResolvedValue(PROVISIONAL)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Choisissez votre mot de passe' })).toBeInTheDocument()
    expect(screen.getByText(/Bienvenue, marie\.pierre/)).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe provisoire')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument()
  })

  it('CA-07 : après le changement → tableau de bord', async () => {
    getAdminMe.mockResolvedValue(PROVISIONAL)
    const user = userEvent.setup()
    renderPage()
    await screen.findByLabelText('Mot de passe provisoire')

    await fill(user, 'Provisoire-2026!', 'Mon-propre-mot-2026')

    expect(changeMyAdminPassword).toHaveBeenCalledWith('Provisoire-2026!', 'Mon-propre-mot-2026', 'Mon-propre-mot-2026')
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it('CA-08 : changement volontaire → message, champs vidés', async () => {
    getAdminMe.mockResolvedValue(REGULAR)
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()

    await fill(user, 'Admin-Test-2026', 'Mon-propre-mot-2026')

    expect(await screen.findByText(PASSWORD_CHANGED)).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('')
    expect(screen.getByLabelText('Nouveau mot de passe')).toHaveValue('')
  })

  it.each([
    ['WRONG_PASSWORD', 'Mot de passe actuel incorrect.', 'current_password', 'Mot de passe actuel'],
    ['PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 12 caractères.', 'new_password', 'Nouveau mot de passe'],
    ['PASSWORD_MISMATCH', 'Les deux mots de passe ne correspondent pas.', 'new_password_confirmation', 'Confirmer le nouveau mot de passe'],
  ])('CA-08 : erreur %s affichée sous le champ concerné', async (code, message, field, label) => {
    getAdminMe.mockResolvedValue(REGULAR)
    changeMyAdminPassword.mockRejectedValue(new ApiError(422, code, message, field))
    const user = userEvent.setup()
    renderPage()
    await screen.findByLabelText('Mot de passe actuel')

    await fill(user, 'x', 'y', 'z')

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(PASSWORD_CHANGED)).not.toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    getAdminMe.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
