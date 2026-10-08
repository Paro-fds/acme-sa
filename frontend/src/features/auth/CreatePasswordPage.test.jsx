import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { register } from '../../api/auth.js'
import { ApiError } from '../../api/client.js'
import CreatePasswordPage from './CreatePasswordPage.jsx'

vi.mock('../../api/auth.js', () => ({ register: vi.fn() }))

const IDENTITY = { last_name: 'JOSEPH', first_name: 'Jean', birth_date: '1996-03-15' }
const REFUSED =
  'Impossible de créer un mot de passe avec ces informations. Vérifiez votre nom et votre date de naissance ; si vous avez déjà un mot de passe, connectez-vous.'

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/connexion/premiere']}>
      <Routes>
        <Route path="/connexion" element={<p>Écran de connexion</p>} />
        <Route path="/connexion/premiere" element={<CreatePasswordPage />} />
        <Route path="/connexion/homonyme" element={<p>Écran homonymes</p>} />
        <Route path="/profil" element={<p>Écran profil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fill(user, password = 'Bonjour-2026', confirmation = password) {
  await user.type(screen.getByLabelText('Nom de famille'), 'JOSEPH')
  await user.type(screen.getByLabelText('Prénom'), 'Jean')
  await user.type(screen.getByLabelText('Date de naissance'), '1996-03-15')
  await user.type(screen.getByLabelText('Mot de passe'), password)
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), confirmation)
}

const submit = () => screen.getByRole('button', { name: 'Créer mon mot de passe' })

describe('CreatePasswordPage (US-101, décision 4)', () => {
  it('même présentation que la connexion, avec la confirmation du mot de passe', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Première connexion' })).toBeInTheDocument()
    expect(screen.getByText('Au moins 8 caractères.')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('la création réussie ouvre le profil', async () => {
    register.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    expect(register).toHaveBeenCalledWith(IDENTITY, 'Bonjour-2026', 'Bonjour-2026')
    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('une règle du mot de passe non respectée s’affiche sous le champ concerné', async () => {
    register.mockRejectedValue(
      new ApiError(422, 'PASSWORD_MISMATCH', 'Les deux mots de passe ne correspondent pas.', 'password_confirmation'),
    )
    const user = userEvent.setup()
    renderPage()

    await fill(user, 'Bonjour-2026', 'Bonjour-2027')
    await user.click(submit())

    expect(await screen.findByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAttribute('aria-invalid', 'true')
  })

  it('CA-03 : un refus affiche un seul message, que la personne existe ou non', async () => {
    register.mockRejectedValue(new ApiError(409, 'REGISTRATION_REFUSED', REFUSED))
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent(REFUSED)
  })

  it('homonymes complets : écran dédié', async () => {
    register.mockRejectedValue(new ApiError(409, 'IDENTITY_AMBIGUOUS', 'Plusieurs dossiers correspondent.'))
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    expect(await screen.findByText('Écran homonymes')).toBeInTheDocument()
  })

  it('un lien ramène à la connexion pour qui a déjà un mot de passe', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('link', { name: 'Vous avez déjà un mot de passe ? Se connecter' }))

    expect(screen.getByText('Écran de connexion')).toBeInTheDocument()
  })
})
