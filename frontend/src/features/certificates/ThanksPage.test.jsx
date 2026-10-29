import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendFeedback } from '../../api/certificates.js'
import ThanksPage from './ThanksPage.jsx'

vi.mock('../../api/certificates.js', () => ({ sendFeedback: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const CERTIFICATE = {
  id: 'c1',
  title: 'Licence en sciences comptables',
  institution: "Université d'État d'Haïti",
  year: 2019,
  type_label: 'Diplôme',
  level_label: 'Licence',
  status: 'RECEIVED',
  status_label: 'Reçu',
  unlocks: {
    level: 'Licence',
    searchable: 'Une fois validé, vous apparaissez dans les recherches des RH pour les promotions et les postes à pourvoir.',
  },
}

function renderPage(state = { certificate: CERTIFICATE, fileName: 'licence.pdf', fileSize: 1887436, firstName: 'Lucie' }) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/certificats/merci', state }]}>
      <Routes>
        <Route path="/certificats/merci" element={<ThanksPage />} />
        <Route path="/certificats" element={<p>Mes certificats</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-302 — Après le dépôt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendFeedback.mockResolvedValue()
  })

  it('CA-01 : remerciement, récapitulatif et statut « Reçu »', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Merci, Lucie !' })).toBeVisible()
    const summary = screen.getByRole('region', { name: 'Récapitulatif du dépôt' })
    expect(summary).toHaveTextContent('Licence en sciences comptables')
    expect(summary).toHaveTextContent("Université d'État d'Haïti")
    expect(summary).toHaveTextContent('2019')
    expect(summary).toHaveTextContent('licence.pdf')
    expect(summary).toHaveTextContent('Reçu')
    expect(screen.getByText('Réponse sous 5 jours ouvrables')).toBeVisible()
  })

  it('CA-02 : ce que le certificat débloque', () => {
    renderPage()

    const unlocks = screen.getByRole('region', { name: 'Ce que ce certificat débloque' })
    expect(unlocks).toHaveTextContent('Une fois validé, votre niveau d’études devient Licence.')
    expect(unlocks).toHaveTextContent('recherches des RH pour les promotions et les postes à pourvoir')
  })

  it('CA-03 : l’avis en un clic, facultatif', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Facile/ }))

    expect(sendFeedback).toHaveBeenCalledWith('c1', 3)
    expect(await screen.findByText('Merci pour votre avis.')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Facile/ })).not.toBeInTheDocument()
  })

  it('sans dépôt à afficher (page rechargée), retour à « Mes certificats »', async () => {
    renderPage(null)

    expect(await screen.findByText('Mes certificats')).toBeVisible()
  })
})
