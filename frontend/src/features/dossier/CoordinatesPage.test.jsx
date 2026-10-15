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

  it('propose les valeurs de l’export, à confirmer', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mes coordonnées' })).toBeVisible()
    expect(screen.getByText('Section 1 / 3')).toBeVisible()
    expect(screen.getByLabelText(/Numéro de téléphone principal/)).toHaveValue('+509 3722 1111')
    expect(screen.getAllByText('À confirmer')).toHaveLength(2)
    expect(screen.getByText('À compléter')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Progression du dossier' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('enregistre, confirme et fait monter le pourcentage', async () => {
    renderPage()
    const phone = await screen.findByLabelText(/Numéro de téléphone principal/)
    await userEvent.clear(phone)
    await userEvent.type(phone, '3712 3456')
    await userEvent.click(screen.getByRole('checkbox', { name: /Je n'ai pas d'adresse email/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(saveCoordinates).toHaveBeenCalledWith({
      telephone: '3712 3456',
      address: '12 rue Capois, Port-au-Prince',
      email: '',
      no_email: true,
    })
    expect(await screen.findByText('Enregistré dans votre profil.')).toBeVisible()
    expect(screen.getAllByText('Complet')).toHaveLength(3)
    expect(screen.getByText('37 %')).toBeVisible()
  })

  it('US-207 CA-03 : l’identité connue des RH, en lecture seule (écran 08)', async () => {
    renderPage()

    const identity = await screen.findByRole('region', { name: /Identité RH vérifiée/ })
    expect(identity).toHaveTextContent('EXEMPLE')
    expect(identity).toHaveTextContent('AC-7429 · Agence Démo')
    expect(within(identity).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('CA-03 : « Je n’ai pas d’adresse email » désactive le champ email', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('checkbox', { name: /Je n'ai pas d'adresse email/ }))

    expect(screen.getByLabelText(/Adresse email/)).toBeDisabled()
    expect(screen.getByText('Sans email, vous recevrez les notifications par WhatsApp.')).toBeVisible()
  })

  it('CA-02 : un format invalide affiche le message près du champ', async () => {
    saveCoordinates.mockRejectedValue(
      new ApiError(422, 'INVALID_FIELD', 'Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456.', 'telephone'),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }))

    const phone = screen.getByLabelText(/Numéro de téléphone principal/)
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveAccessibleDescription(/Le numéro doit contenir 8 chiffres/)
    expect(screen.getByText('À corriger')).toBeVisible()
  })
})
