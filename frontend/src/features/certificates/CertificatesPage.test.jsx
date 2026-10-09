import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProfile } from '../../api/employee.js'
import { listCertificates } from '../../api/certificates.js'
import CertificatesPage from './CertificatesPage.jsx'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/certificates.js', () => ({ listCertificates: vi.fn() }))
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

function completion(missing) {
  const elements = KEYS.map(([key, label]) => ({ key, label, complete: !missing.includes(key) }))
  const complete = elements.filter((e) => e.complete).length
  return { percent: Math.floor((100 * complete) / 8), complete, total: 8, is_complete: complete === 8, elements }
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/certificats']}>
      <Routes>
        <Route path="/certificats" element={<CertificatesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-204 — Savoir ce qui me reste avant de déposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listCertificates.mockResolvedValue({ certificates: [], limit: 20 })
  })

  it('CA-01 : profil incomplet → « Il reste N informations » et un lien vers chacune', async () => {
    getProfile.mockResolvedValue({ completion: completion(['emergency_contact', 'position_confirmed']) })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Il reste 2 informations à compléter avant de déposer votre certificat' })).toBeVisible()
    const list = screen.getByRole('list', { name: 'Informations à compléter' })
    expect(within(list).getByRole('link', { name: /Ajouter mon contact d'urgence/ })).toHaveAttribute('href', '/profil/contact-etudes')
    expect(within(list).getByRole('link', { name: /Confirmer mon poste/ })).toHaveAttribute('href', '/profil/informations-rh')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
  })

  it('CA-01 : une seule information au singulier', async () => {
    getProfile.mockResolvedValue({ completion: completion(['email']) })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Il reste 1 information à compléter avant de déposer votre certificat' })).toBeVisible()
  })

  it('CA-02 : à 8 sur 8, le dépôt s’ouvre', async () => {
    getProfile.mockResolvedValue({ completion: completion([]) })
    renderPage()

    expect(await screen.findByRole('link', { name: /Déposer un certificat/ })).toHaveAttribute('href', '/certificats/deposer')
    expect(screen.queryByRole('list', { name: 'Informations à compléter' })).not.toBeInTheDocument()
  })

  it('CA-03 : aucun mot de sanction', async () => {
    getProfile.mockResolvedValue({ completion: completion(['email']) })
    renderPage()
    await screen.findByRole('list', { name: 'Informations à compléter' })

    expect(document.body.textContent).not.toMatch(/bloqu|interdit|refus|sanction/i)
  })
})

describe('US-303 — Suivre mon certificat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfile.mockResolvedValue({ completion: completion([]) })
  })

  it('CA-01 : chaque certificat affiche son statut', async () => {
    const certificate = (id, title, status) => ({
      id,
      title,
      status,
      type_label: 'Diplôme',
      level_label: 'Licence',
      institution: 'Université Démo',
      year: 2019,
      submitted_at: '2026-10-08T09:00:00Z',
    })
    listCertificates.mockResolvedValue({
      certificates: [
        certificate('c1', 'Licence en sciences comptables', 'RECEIVED'),
        certificate('c2', 'Baccalauréat', 'IN_REVIEW'),
        certificate('c3', 'Master', 'VALIDATED'),
        certificate('c4', 'Certificat microfinance', 'TO_CORRECT'),
      ],
      limit: 20,
      validated_level: 'Master',
    })
    renderPage()

    const items = within(await screen.findByRole('list', { name: 'Certificats déposés' })).getAllByRole('listitem')
    expect(screen.getByRole('region', { name: "Niveau d'études validé" })).toHaveTextContent('Master')
    expect(screen.getByText('4 titres déposés')).toBeVisible()
    expect(items.map((item) => [item.querySelector('p').textContent, item.textContent.match(/Reçu|En vérification|Validé|À corriger/)[0]])).toEqual([
      ['Licence en sciences comptables', 'Reçu'],
      ['Baccalauréat', 'En vérification'],
      ['Master', 'Validé'],
      ['Certificat microfinance', 'À corriger'],
    ])
  })

  it('aucun certificat : un message, et le dépôt reste proposé', async () => {
    listCertificates.mockResolvedValue({ certificates: [], limit: 20 })
    renderPage()

    expect(await screen.findByText("Aucun certificat déposé pour l'instant.")).toBeVisible()
    expect(screen.getByRole('link', { name: /Déposer un certificat/ })).toBeVisible()
  })

  it('CA-04 de US-301 : à 20 certificats, le dépôt n’est plus proposé', async () => {
    listCertificates.mockResolvedValue({
      certificates: Array.from({ length: 2 }, (_, i) => ({ id: `c${i}`, title: `T${i}`, status: 'RECEIVED', type_label: 'Diplôme', level_label: 'Licence', institution: 'U', year: 2019, submitted_at: '2026-10-08T09:00:00Z' })),
      limit: 2,
    })
    renderPage()

    expect(await screen.findByText('Vous avez déposé 2 certificats, le nombre maximum.')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
  })
})
