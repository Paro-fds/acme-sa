import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDossier } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import EmployeeHomePage from './EmployeeHomePage.jsx'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const KEYS = [
  ['telephone', 'Téléphone'],
  ['address', 'Adresse'],
  ['email', 'Email'],
  ['emergency_contact', "Contact d'urgence"],
  ['education_level', "Niveau d'études"],
  ['agency_confirmed', 'Agence confirmée'],
  ['position_confirmed', 'Poste confirmé'],
  ['hire_date_confirmed', "Date d'embauche confirmée"],
]

function profile(missing) {
  const elements = KEYS.map(([key, label]) => ({ key, label, complete: !missing.includes(key) }))
  const complete = elements.filter((e) => e.complete).length
  return {
    first_name: 'Lucie',
    last_name: 'EXEMPLE',
    position: 'Chargée de crédit',
    affectation: { agency: 'Agence Démo', region: null, direction: null },
    completion: { percent: Math.floor((100 * complete) / 8), complete, total: 8, is_complete: complete === 8, elements },
  }
}

function ConsentProbe() {
  return <p>Avant de commencer, puis {useLocation().state?.next}</p>
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/accueil']}>
      <Routes>
        <Route path="/accueil" element={<EmployeeHomePage />} />
        <Route path="/avant-de-commencer" element={<ConsentProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-207 CA-01 — Accueil de l’employé (écran 06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDossier.mockResolvedValue({ consent: { information_notice_at: '2026-10-08T09:00:00Z', whatsapp: false } })
  })

  it('bonjour, poste et agence, pourcentage', async () => {
    getProfile.mockResolvedValue(profile(['emergency_contact', 'education_level', 'position_confirmed']))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Bonjour Lucie' })).toBeVisible()
    expect(screen.getByText('Chargée de crédit · Agence Démo')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Votre dossier est complet à 62 %' })).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Progression du dossier' })).toHaveAttribute('aria-valuenow', '62')
    expect(screen.getByText('« Plus que 3 étapes, Lucie ! »')).toBeVisible()
  })

  it('ce qui reste, avec un bouton par élément', async () => {
    getProfile.mockResolvedValue(profile(['emergency_contact', 'education_level', 'position_confirmed']))
    renderPage()

    const remaining = await screen.findByRole('region', { name: 'Il reste 3 informations à compléter' })
    expect(within(remaining).getByRole('link', { name: /Contact d'urgence.*Renseigner/ })).toHaveAttribute('href', '/profil/contact-etudes')
    expect(within(remaining).getByRole('link', { name: /Niveau d'études.*Compléter/ })).toHaveAttribute('href', '/profil/contact-etudes')
    expect(within(remaining).getByRole('link', { name: /Confirmer votre poste.*Confirmer/ })).toHaveAttribute('href', '/profil/informations-rh')
  })

  it('dépôt fermé tant que le profil n’est pas complet, ouvert à 100 %', async () => {
    getProfile.mockResolvedValue(profile(['email']))
    renderPage()
    const deposit = await screen.findByRole('region', { name: 'Dépôt de certificats' })
    expect(deposit).toHaveTextContent('Disponible dès votre profil complet')
    expect(within(deposit).queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
  })

  it('à 100 % : plus de liste, le dépôt est ouvert', async () => {
    getProfile.mockResolvedValue(profile([]))
    renderPage()

    const deposit = await screen.findByRole('region', { name: 'Dépôt de certificats' })
    expect(within(deposit).getByRole('link', { name: /Déposer un certificat/ })).toHaveAttribute('href', '/certificats/deposer')
    expect(screen.queryByRole('region', { name: /Il reste/ })).not.toBeInTheDocument()
  })

  it('la barre du bas mène à Accueil, Mon profil, Mes certificats', async () => {
    getProfile.mockResolvedValue(profile([]))
    renderPage()

    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/accueil', '/profil', '/certificats'])
    expect(within(nav).getByRole('link', { name: /Accueil/ })).toHaveAttribute('aria-current', 'page')
  })

  it('première connexion : « Avant de commencer » passe d’abord (écran 05)', async () => {
    getProfile.mockResolvedValue(profile([]))
    getDossier.mockResolvedValue({ consent: { information_notice_at: null, whatsapp: null } })
    renderPage()

    expect(await screen.findByText('Avant de commencer, puis /accueil')).toBeVisible()
  })
})
