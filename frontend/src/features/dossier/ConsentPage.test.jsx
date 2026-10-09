import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDossier, giveConsent } from '../../api/dossier.js'
import ConsentPage from './ConsentPage.jsx'
import { NO_CONSENT, dossierFixture } from './testData.js'

vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), giveConsent: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

function renderPage(next = '/profil/coordonnees') {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/avant-de-commencer', state: { next } }]}>
      <Routes>
        <Route path="/avant-de-commencer" element={<ConsentPage />} />
        <Route path="/profil/coordonnees" element={<p>Écran des coordonnées</p>} />
        <Route path="/profil" element={<p>Écran du profil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-202 CA-01 — Avant de commencer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDossier.mockResolvedValue(dossierFixture({ consent: NO_CONSENT }))
    giveConsent.mockResolvedValue(dossierFixture())
  })

  it('explique pourquoi on collecte et qui y a accès', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Avant de commencer' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Pourquoi nous collectons ces données ?' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Qui a accès à ces informations ?' })).toBeVisible()
    expect(screen.getByText(/Uniquement la Direction des Ressources Humaines/)).toBeVisible()
  })

  it('la mention complète se lit sur place', async () => {
    renderPage()
    await userEvent.click(await screen.findByText("Lire la mention d'information complète"))

    expect(screen.getByText(/Ce que nous collectons/)).toBeVisible()
  })

  it('continuer reste impossible tant que la case obligatoire n’est pas cochée', async () => {
    renderPage()
    const button = await screen.findByRole('button', { name: /Continuer vers mon espace/ })

    expect(button).toBeDisabled()
    expect(screen.getByText('Veuillez cocher la case obligatoire pour continuer')).toBeVisible()

    await userEvent.click(screen.getByRole('checkbox', { name: /J'ai lu et j'accepte/ }))
    expect(button).toBeEnabled()
  })

  it('enregistre l’accord et le choix WhatsApp, puis ouvre l’écran demandé', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('checkbox', { name: /J'ai lu et j'accepte/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /messages WhatsApp/ }))
    await userEvent.click(screen.getByRole('button', { name: /Continuer vers mon espace/ }))

    expect(giveConsent).toHaveBeenCalledWith({ information_notice: true, whatsapp: true })
    expect(await screen.findByText('Écran des coordonnées')).toBeVisible()
  })

  it('une seule fois : déjà donné, l’écran passe directement à la suite', async () => {
    getDossier.mockResolvedValue(dossierFixture())
    renderPage()

    expect(await screen.findByText('Écran des coordonnées')).toBeVisible()
    expect(giveConsent).not.toHaveBeenCalled()
  })
})
