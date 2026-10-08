import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { login } from '../../api/auth.js'
import { ApiError } from '../../api/client.js'
import LoginPage from './LoginPage.jsx'

vi.mock('../../api/auth.js', () => ({ login: vi.fn() }))

const GENERIC =
  'Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe.'
const IDENTITY = { last_name: 'JOSEPH', first_name: 'Jean', birth_date: '1996-03-15' }

function renderPage(state) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/connexion', state }]}>
      <Routes>
        <Route path="/" element={<p>Écran accueil</p>} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/connexion/premiere" element={<p>Écran création du mot de passe</p>} />
        <Route path="/connexion/homonyme" element={<p>Écran homonymes</p>} />
        <Route path="/profil" element={<p>Écran profil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fill(user, password = 'Bonjour-2026') {
  await user.type(screen.getByLabelText('Nom de famille'), 'JOSEPH')
  await user.type(screen.getByLabelText('Prénom'), 'Jean')
  await user.type(screen.getByLabelText('Date de naissance'), '1996-03-15')
  await user.type(screen.getByLabelText('Mot de passe'), password)
}

const submit = () => screen.getByRole('button', { name: /Me connecter|Suspendu/ })

afterEach(() => {
  vi.useRealTimers()
})

describe('LoginPage (US-101)', () => {
  it('CA-05 : nom, prénom, date de naissance et mot de passe sur un seul écran', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nom de famille')).toBeInTheDocument()
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de naissance')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('figure', { name: 'La Penseuse' })).toBeInTheDocument()
  })

  it('le bouton reste inactif tant que le formulaire est incomplet', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(submit()).toBeDisabled()
    await user.type(screen.getByLabelText('Nom de famille'), 'JOSEPH')
    await user.type(screen.getByLabelText('Prénom'), '   ')
    expect(submit()).toBeDisabled()
  })

  it('CA-01 : des informations exactes ouvrent le profil', async () => {
    login.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    expect(login).toHaveBeenCalledWith(IDENTITY, 'Bonjour-2026')
    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('CA-03 : un seul message quand la connexion échoue ; le mot de passe est effacé', async () => {
    login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', GENERIC))
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Vérification demandée')
    expect(alert).toHaveTextContent(GENERIC)
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
    expect(screen.getByLabelText('Nom de famille')).toHaveValue('JOSEPH')
  })

  it('CA-06 : pendant la suspension, un compte à rebours ; le bouton se réactive à la fin', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    login.mockRejectedValue(
      new ApiError(423, 'ACCOUNT_LOCKED', 'Trop de tentatives. Réessayez dans 15 minutes.', null, { retry_after: 65 }),
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await fill(user)
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Espace temporairement suspendu')
    expect(alert).toHaveTextContent('Une question ? Adressez-vous au service RH de votre agence.')
    expect(submit()).toBeDisabled()
    expect(submit()).toHaveTextContent('Suspendu temporairement (01:05)')

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(submit()).toHaveTextContent('Suspendu temporairement (01:00)')

    await act(async () => {
      vi.advanceTimersByTime(60000)
    })
    expect(submit()).toHaveTextContent('Me connecter')
    expect(screen.queryByText('Espace temporairement suspendu')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Mot de passe'), 'Bonjour-2026')
    expect(submit()).toBeEnabled()
  })

  it('CA-05 : « Première connexion ? Créer mon mot de passe » mène à la création du mot de passe', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('link', { name: 'Première connexion ? Créer mon mot de passe' }))

    expect(screen.getByText('Écran création du mot de passe')).toBeInTheDocument()
  })

  it('homonymes complets : écran dédié, aucun dossier ouvert', async () => {
    login.mockRejectedValue(new ApiError(409, 'IDENTITY_AMBIGUOUS', 'Plusieurs dossiers correspondent.'))
    const user = userEvent.setup()
    renderPage()

    await fill(user)
    await user.click(submit())

    expect(await screen.findByText('Écran homonymes')).toBeInTheDocument()
  })

  it('le message de déconnexion ou de session expirée reçu en arrivant est affiché', () => {
    renderPage({ notice: 'Vous êtes déconnecté.' })

    expect(screen.getByRole('status')).toHaveTextContent('Vous êtes déconnecté.')
  })

  it('« Mot de passe oublié ? » explique comment retrouver l’accès', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }))

    expect(screen.getByRole('status')).toHaveTextContent("Contactez l'administration")
  })

  it('le retour mène à la page d’accueil', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Retour' }))

    expect(screen.getByText('Écran accueil')).toBeInTheDocument()
  })
})
