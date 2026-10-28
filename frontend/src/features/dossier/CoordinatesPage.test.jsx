import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { getDossier, saveCoordinates } from '../../api/dossier.js'
import CoordinatesPage from './CoordinatesPage.jsx'
import { NO_CONSENT, dossierFixture } from './testData.js'

vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), saveCoordinates: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))
vi.mock('../../api/employee.js', () => ({
  getProfile: vi.fn(() =>
    Promise.resolve({
      last_name: 'EXEMPLE',
      first_name: 'Lucie',
      employee_code: 'AC-7429',
      position: 'Chargée de crédit',
      affectation: { agency: 'Agence Démo' },
    }),
  ),
}))

function ConsentScreen() {
  return <p>Consentement, puis {useLocation().state?.next}</p>
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/profil/coordonnees']}>
      <Routes>
        <Route path="/profil/coordonnees" element={<CoordinatesPage />} />
        <Route path="/avant-de-commencer" element={<ConsentScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

const SAVED = dossierFixture({
  telephone: { value: '+509 3712 3456', complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  address: { value: '12 rue Capois, Port-au-Prince', complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  email: { value: null, no_email: true, complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  completion: { percent: 37, complete: 3, total: 8 },
})

describe('US-202 — Mes coordonnées (section 1 / 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDossier.mockResolvedValue(dossierFixture())
    saveCoordinates.mockResolvedValue(SAVED)
  })

  it('CA-01 : sans consentement, l’employé passe d’abord par « Avant de commencer »', async () => {
    getDossier.mockResolvedValue(dossierFixture({ consent: NO_CONSENT }))
    renderPage()

    expect(await screen.findByText('Consentement, puis /profil/coordonnees')).toBeVisible()
  })

  it('US-1011 CA-01 : téléphone et courriel de Vault en lecture seule, l’adresse à confirmer', async () => {
    getDossier.mockResolvedValue(
      dossierFixture({
        telephone: { value: '+509 3722 1111', complete: true, confirmed_at: null, read_only: true },
        email: { value: 'lucie@exemple.test', no_email: false, complete: true, confirmed_at: null, read_only: true },
      }),
    )
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mes coordonnées' })).toBeVisible()
    const fixed = screen.getByLabelText('Coordonnées enregistrées par la DRH')
    expect(fixed).toHaveTextContent('+509 3722 1111')
    expect(fixed).toHaveTextContent('lucie@exemple.test')
    expect(within(fixed).getAllByRole('img', { name: 'Non modifiable' })).toHaveLength(2)
    expect(screen.queryByLabelText(/Numéro de téléphone principal/)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText(/Pour les changer, adressez-vous à la DRH\./)).toBeVisible()
    expect(screen.getByLabelText(/Adresse de résidence/)).toHaveValue('12 rue Capois, Port-au-Prince')
  })

  it('US-1011 CA-02 : seule l’adresse est envoyée', async () => {
    renderPage()
    const address = await screen.findByLabelText(/Adresse de résidence/)
    await userEvent.clear(address)
    await userEvent.type(address, '8 rue Pavée, Jacmel')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(saveCoordinates).toHaveBeenCalledWith({ address: '8 rue Pavée, Jacmel' })
    expect(await screen.findByText('Enregistré dans votre profil.')).toBeVisible()
    expect(screen.getByText('37 %')).toBeVisible()
  })

  it('US-207 CA-03 : l’identité connue des RH, en lecture seule (écran 08)', async () => {
    renderPage()

    const identity = await screen.findByRole('region', { name: /Identité RH vérifiée/ })
    expect(identity).toHaveTextContent('EXEMPLE')
    expect(identity).toHaveTextContent('AC-7429 · Agence Démo')
    expect(within(identity).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('CA-02 : une adresse invalide affiche le message près du champ', async () => {
    saveCoordinates.mockRejectedValue(new ApiError(422, 'INVALID_FIELD', 'Adresse trop courte.', 'address'))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }))

    const address = screen.getByLabelText(/Adresse de résidence/)
    expect(address).toHaveAttribute('aria-invalid', 'true')
    expect(address).toHaveAccessibleDescription(/Adresse trop courte/)
  })
})
