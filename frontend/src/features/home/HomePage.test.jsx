import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('HomePage (US-105)', () => {
  it("CA-01 : la page d'accueil s'affiche à l'adresse du portail, sans connexion ni appel au serveur", () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Votre carrière commence par un dossier complet' })).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('CA-02 : elle présente les 3 bénéfices', () => {
    renderHome()

    const benefits = screen.getByRole('list', { name: 'Ce que le portail vous apporte' })
    const items = benefits.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Promotion plus rapide' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Repéré pour les postes vacants' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Votre carrière en main' })).toBeInTheDocument()
  })

  it('CA-03 : la mascotte « La Penseuse » accueille l’employé', () => {
    renderHome()

    expect(screen.getByRole('figure', { name: 'La Penseuse' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'La Penseuse' })).toHaveTextContent(/Mascotte\s*:\s*La Penseuse/)
    expect(screen.getByText('Conseil RH bienveillant')).toBeInTheDocument()
  })

  it("CA-04 : le pourcentage du dossier n'y figure pas (il apparaît après la connexion)", () => {
    renderHome()

    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('CA-05 : la barre fixe regroupe confidentialité, connexion et aide RH', async () => {
    const user = userEvent.setup()
    renderHome()

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('Accès réservé aux 364 collaborateurs ACME SA')
    expect(footer).toHaveTextContent('Besoin d’aide pour vous connecter ? Contactez les RH')
    await user.click(screen.getByRole('link', { name: 'Se connecter' }))
    expect(screen.getByText('Écran de connexion')).toBeInTheDocument()
  })

  it('CA-06 : affiche les chiffres confirmés, sans lieux non confirmés ni promesse de dossier déjà vérifié', () => {
    renderHome()

    expect(screen.getByText('28 agences interconnectées')).toBeInTheDocument()
    expect(screen.getByText('364 collaborateurs ACME SA')).toBeInTheDocument()
    expect(screen.queryByText(/\b(35|500)\b/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cap-Haïtien/)).not.toBeInTheDocument()
    expect(screen.queryByText(/dossier est déjà complet et vérifié/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Réseau Ouest|Artibonite|Plateau Central/i)).not.toBeInTheDocument()
  })

  it("l'écran de connexion se trouve désormais à /connexion", () => {
    render(
      <MemoryRouter initialEntries={['/connexion']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument()
  })
})
