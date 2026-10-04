import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import PasswordPage from './PasswordPage.jsx'
import { login, register } from '../../api/auth.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/auth.js', () => ({ register: vi.fn(), login: vi.fn() }))

const IDENTITY = { last_name: 'JOSEPH', first_name: 'Jean', birth_date: '1996-03-15' }

function renderPage(state = { identity: IDENTITY, mode: 'create' }) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/connexion/mot-de-passe', state }]}>
      <Routes>
        <Route path="/" element={<p>Écran identification</p>} />
        <Route path="/connexion/mot-de-passe" element={<PasswordPage />} />
        <Route path="/profil" element={<p>Écran profil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const passwordInput = () => screen.getByLabelText('Mot de passe')
const confirmationInput = () => screen.getByLabelText('Confirmer le mot de passe')

describe('PasswordPage — création (US-02)', () => {
  it('CA-01 : la création réussie mène au profil', async () => {
    register.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    await user.type(passwordInput(), 'Bonjour-2026')
    await user.type(confirmationInput(), 'Bonjour-2026')
    await user.click(screen.getByRole('button', { name: 'Créer mon mot de passe' }))

    expect(register).toHaveBeenCalledWith(IDENTITY, 'Bonjour-2026', 'Bonjour-2026')
    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('CA-02 : le message « trop court » s’affiche sous le champ mot de passe', async () => {
    register.mockRejectedValue(
      new ApiError(422, 'PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 8 caractères.', 'password'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(passwordInput(), 'court')
    await user.type(confirmationInput(), 'court')
    await user.click(screen.getByRole('button', { name: 'Créer mon mot de passe' }))

    expect(await screen.findByText('Le mot de passe doit contenir au moins 8 caractères.')).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('CA-03 : le message « ne correspondent pas » s’affiche sous la confirmation', async () => {
    register.mockRejectedValue(
      new ApiError(422, 'PASSWORD_MISMATCH', 'Les deux mots de passe ne correspondent pas.', 'password_confirmation'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(passwordInput(), 'Bonjour-2026')
    await user.type(confirmationInput(), 'Bonjour-2027')
    await user.click(screen.getByRole('button', { name: 'Créer mon mot de passe' }))

    expect(await screen.findByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument()
    expect(confirmationInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('CA-04 : un compte déjà existant affiche le message de l’API', async () => {
    register.mockRejectedValue(
      new ApiError(409, 'ACCOUNT_ALREADY_EXISTS', 'Un mot de passe existe déjà pour ce dossier.'),
    )
    const user = userEvent.setup()
    renderPage()

    await user.type(passwordInput(), 'Bonjour-2026')
    await user.type(confirmationInput(), 'Bonjour-2026')
    await user.click(screen.getByRole('button', { name: 'Créer mon mot de passe' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Un mot de passe existe déjà pour ce dossier.')
  })

  it('CA-07 : la règle des 8 caractères est indiquée avant la saisie', () => {
    renderPage()

    expect(passwordInput()).toHaveAccessibleDescription('Au moins 8 caractères.')
  })

  it('CA-07 : chaque champ peut être affiché puis masqué', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(passwordInput()).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Afficher : Mot de passe' }))
    expect(passwordInput()).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Masquer : Mot de passe' }))
    expect(passwordInput()).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Afficher : Confirmer le mot de passe' }))
    expect(confirmationInput()).toHaveAttribute('type', 'text')
  })

  it('le bouton reste inactif tant que les deux champs ne sont pas remplis', async () => {
    const user = userEvent.setup()
    renderPage()

    const button = screen.getByRole('button', { name: 'Créer mon mot de passe' })
    expect(button).toBeDisabled()
    await user.type(passwordInput(), 'Bonjour-2026')
    expect(button).toBeDisabled()
  })

  it("sans identification préalable, l'écran renvoie à l'identification", () => {
    renderPage(null)

    expect(screen.getByText('Écran identification')).toBeInTheDocument()
  })
})

describe('PasswordPage — saisie (US-03)', () => {
  const enterMode = { identity: IDENTITY, mode: 'enter' }

  it('CA-01 : la connexion réussie mène au profil', async () => {
    login.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage(enterMode)

    expect(screen.queryByLabelText('Confirmer le mot de passe')).not.toBeInTheDocument()
    await user.type(passwordInput(), 'Bonjour-2026')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(login).toHaveBeenCalledWith(IDENTITY, 'Bonjour-2026')
    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('CA-02 : un mauvais mot de passe affiche le message et les tentatives restantes sous le champ', async () => {
    login.mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Mot de passe incorrect. Il vous reste 2 tentatives.', 'password'),
    )
    const user = userEvent.setup()
    renderPage(enterMode)

    await user.type(passwordInput(), 'mauvais-mdp')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Mot de passe incorrect. Il vous reste 2 tentatives.')).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('CA-03 : le blocage est signalé', async () => {
    login.mockRejectedValue(new ApiError(423, 'ACCOUNT_LOCKED', 'Trop de tentatives. Réessayez dans 15 minutes.'))
    const user = userEvent.setup()
    renderPage(enterMode)

    await user.type(passwordInput(), 'Bonjour-2026')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives. Réessayez dans 15 minutes.')
  })

  it("CA-06 : sans mot de passe enregistré, l'écran passe en création", async () => {
    login.mockRejectedValue(new ApiError(409, 'PASSWORD_NOT_SET', "Vous n'avez pas encore créé de mot de passe."))
    const user = userEvent.setup()
    renderPage(enterMode)

    await user.type(passwordInput(), 'Bonjour-2026')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Créez votre mot de passe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
  })

  it('CA-08 : « Mot de passe oublié ? » explique comment récupérer l’accès', async () => {
    const user = userEvent.setup()
    renderPage(enterMode)

    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      "Contactez l'administration : elle réinitialisera votre accès et vous pourrez créer un nouveau mot de passe.",
    )
  })

  it("CA-08 : le lien n'apparaît pas lors de la création du mot de passe", () => {
    renderPage()

    expect(screen.queryByRole('button', { name: 'Mot de passe oublié ?' })).not.toBeInTheDocument()
  })
})
