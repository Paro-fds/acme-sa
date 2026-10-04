import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import IdentifyPage from './IdentifyPage.jsx'
import AmbiguousIdentityPage from './AmbiguousIdentityPage.jsx'
import { identify } from '../../api/auth.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/auth.js', () => ({ identify: vi.fn() }))

function PasswordStepProbe() {
  const { state } = useLocation()
  return <p>Étape mot de passe : {state.mode}</p>
}

function renderPage(initialState) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: initialState }]}>
      <Routes>
        <Route path="/" element={<IdentifyPage />} />
        <Route path="/connexion/mot-de-passe" element={<PasswordStepProbe />} />
        <Route path="/connexion/homonyme" element={<AmbiguousIdentityPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Nom'), 'JOSEPH')
  await user.type(screen.getByLabelText('Prénom'), 'Jean')
  await user.type(screen.getByLabelText('Date de naissance'), '1996-03-15')
  await user.click(screen.getByRole('button', { name: 'Continuer' }))
}

describe('IdentifyPage (US-01)', () => {
  it('CA-09 : le bouton Continuer reste inactif tant que le formulaire est incomplet', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
    await user.type(screen.getByLabelText('Nom'), 'JOSEPH')
    await user.type(screen.getByLabelText('Prénom'), '   ')
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
  })

  it('CA-09 : la date de naissance utilise le sélecteur de date natif du téléphone', () => {
    renderPage()

    expect(screen.getByLabelText('Date de naissance')).toHaveAttribute('type', 'date')
  })

  it("CA-01 : un employé sans mot de passe passe à l'étape de création", async () => {
    identify.mockResolvedValue({ next_step: 'CREATE_PASSWORD' })
    const user = userEvent.setup()
    renderPage()

    await fillAndSubmit(user)

    expect(identify).toHaveBeenCalledWith({ last_name: 'JOSEPH', first_name: 'Jean', birth_date: '1996-03-15' })
    expect(await screen.findByText('Étape mot de passe : create')).toBeInTheDocument()
  })

  it("CA-02 : un employé avec mot de passe passe à l'étape de saisie", async () => {
    identify.mockResolvedValue({ next_step: 'ENTER_PASSWORD' })
    const user = userEvent.setup()
    renderPage()

    await fillAndSubmit(user)

    expect(await screen.findByText('Étape mot de passe : enter')).toBeInTheDocument()
  })

  it("CA-04 : le message de l'API s'affiche si l'identité n'est pas reconnue", async () => {
    identify.mockRejectedValue(
      new ApiError(401, 'IDENTITY_NOT_RECOGNIZED', 'Informations non reconnues. Vérifiez votre saisie.'),
    )
    const user = userEvent.setup()
    renderPage()

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Informations non reconnues. Vérifiez votre saisie.')
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled()
  })

  it("CA-07 : un doublon mène à l'écran « Contactez l'administration »", async () => {
    identify.mockRejectedValue(new ApiError(409, 'IDENTITY_AMBIGUOUS', 'Plusieurs dossiers correspondent.'))
    const user = userEvent.setup()
    renderPage()

    await fillAndSubmit(user)

    expect(await screen.findByRole('heading', { name: 'Plusieurs dossiers correspondent' })).toBeInTheDocument()
    expect(screen.getByText(/Contactez l'administration ACME/)).toBeInTheDocument()
  })

  it('affiche le message transmis par un autre écran (ex. session expirée)', () => {
    renderPage({ message: 'Votre session a expiré. Reconnectez-vous.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Votre session a expiré. Reconnectez-vous.')
  })
  it('US-04 CA-01 : après déconnexion, « Vous êtes déconnecté. » s’affiche comme information', () => {
    renderPage({ notice: 'Vous êtes déconnecté.' })

    expect(screen.getByRole('status')).toHaveTextContent('Vous êtes déconnecté.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
