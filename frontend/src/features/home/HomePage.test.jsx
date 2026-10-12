import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AppRoutes from '../../routes.jsx'
import HomePage from './HomePage.jsx'

function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<p>Écran de connexion</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomePage (US-105, US-110)', () => {
  it("US-105 CA-01 : la page d'accueil s'affiche à l'adresse du portail, sans connexion ni appel au serveur", () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Votre carrière commence par un dossier complet' })).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('US-110 CA-01 : la photo d’une équipe d’ACME SA', () => {
    renderHome()
    expect(screen.getByRole('img', { name: /équipe d.ACME SA/ })).toBeInTheDocument()
  })

  it('US-110 CA-01 : « Ce que vous y gagnez », les 3 bénéfices', () => {
    renderHome()
    const benefits = screen.getByRole('list', { name: 'Ce que vous y gagnez' })
    expect(within(benefits).getAllByRole('listitem')).toHaveLength(3)
    for (const title of ['Vos diplômes reconnus', 'Les postes faits pour vous', 'Tout depuis votre téléphone']) {
      expect(within(benefits).getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })

  it('US-110 CA-01 : « Trois étapes », dans l’ordre du parcours', () => {
    renderHome()
    const steps = within(screen.getByRole('list', { name: 'Trois étapes' })).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringMatching(/Créez votre mot de passe/),
      expect.stringMatching(/Vérifiez les 8 informations de votre profil/),
      expect.stringMatching(/Déposez vos diplômes/),
    ])
  })

  it('US-110 CA-01 : ni mascotte, ni chiffre, ni pourcentage du dossier (D-08)', () => {
    renderHome()
    expect(screen.queryByText(/Penseuse|Mascotte/)).not.toBeInTheDocument()
    expect(screen.queryByText(/364|28 agences|collaborateurs/)).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('US-110 CA-02 : « Compléter mon dossier » mène à la connexion ; l’aide RH reste visible', async () => {
    const user = userEvent.setup()
    renderHome()
    expect(screen.getAllByText('Une question ? Adressez-vous au service RH de votre agence.').length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('link', { name: 'Compléter mon dossier' })[0])
    expect(screen.getByText('Écran de connexion')).toBeInTheDocument()
  })

  it('US-110 CA-02 : « Se connecter » en haut de page mène aussi à la connexion', async () => {
    const user = userEvent.setup()
    renderHome()
    await user.click(screen.getByRole('link', { name: 'Se connecter' }))
    expect(screen.getByText('Écran de connexion')).toBeInTheDocument()
  })
})
