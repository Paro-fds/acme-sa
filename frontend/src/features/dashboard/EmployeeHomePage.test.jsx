import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyCareer } from '../../api/career.js'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import { getDossier, getFreshness } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import { listMyApplications, listMyOpenings } from '../../api/openings.js'
import { setDesktop } from '../../lib/testViewport.js'
import EmployeeHomePage from './EmployeeHomePage.jsx'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), getFreshness: vi.fn(), confirmStillAccurate: vi.fn() }))
vi.mock('../../api/openings.js', () => ({ listMyOpenings: vi.fn(), listMyApplications: vi.fn() }))
vi.mock('../../api/certificates.js', () => ({ listCertificates: vi.fn(), getCertificateForm: vi.fn() }))
vi.mock('../../api/career.js', () => ({ getMyCareer: vi.fn() }))
vi.mock('../../api/notifications.js', () => ({
  getMyNotifications: vi.fn().mockResolvedValue({ items: [], unread_count: 0, has_more: false }),
  markMyNotificationRead: vi.fn(),
}))
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
    first_name: 'Jean',
    last_name: 'EXEMPLE',
    position: 'Agent de crédit',
    hire_date: '2018-06-01',
    affectation: { agency: 'Agence Démo Nord', region: null, direction: null },
    completion: { percent: Math.floor((100 * complete) / 8), complete, total: 8, is_complete: complete === 8, elements },
  }
}

const OPENINGS = {
  items: [
    {
      id: 1,
      title: "Chef d'agence adjoint",
      unit_label: 'Agence Démo Sud',
      opens_on: '2026-10-01',
      closes_on: '2026-11-15',
      criteria_lines: ['Licence au moins', 'Finance', "2 ans dans l'institution"],
    },
    {
      id: 2,
      title: 'Analyste crédit senior',
      unit_label: 'Direction Démo des crédits',
      opens_on: '2026-10-01',
      closes_on: '2026-11-30',
      criteria_lines: [],
    },
  ],
}
const APPLICATION = {
  id: 3,
  opening_title: 'Chargé de crédit',
  received_at: '2026-10-05T09:00:00Z',
  step: 'DRH_REVIEW',
  step_label: 'Étude par la DRH',
  step_number: 2,
  outcome: null,
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T10:00:00'))
  getProfile.mockResolvedValue(profile([]))
  getDossier.mockResolvedValue({ consent: { information_notice_at: '2026-10-08T09:00:00Z', whatsapp: false } })
  getFreshness.mockResolvedValue({
    items: [{ key: 'telephone', label: 'Téléphone', value: '4812 0000', confirmed_at: '2025-12-12T09:00:00Z', expires_on: '2026-12-12', reminder_on: '2026-11-12', state: 'FRESH' }],
    stale_count: 0,
  })
  listMyOpenings.mockResolvedValue(OPENINGS)
  listMyApplications.mockResolvedValue({ items: [APPLICATION] })
  listCertificates.mockResolvedValue({
    certificates: [
      { id: 'a', status: 'VALIDATED', level: 'LICENCE', level_label: 'Licence' },
      { id: 'b', status: 'IN_REVIEW', level: 'MASTER', level_label: 'Master' },
    ],
    limit: 10,
  })
  getCertificateForm.mockResolvedValue({
    levels: [
      { value: 'BACCALAUREAT', label: 'Baccalauréat' },
      { value: 'LICENCE', label: 'Licence' },
      { value: 'MASTER', label: 'Master' },
    ],
  })
  getMyCareer.mockResolvedValue({ kinds: [{ kind: 'EXPERIENCE', count: 3 }, { kind: 'TRAINING', count: 2 }] })
})

afterEach(() => {
  setDesktop(false)
  vi.useRealTimers()
})

describe('US-123 CA-01 — un en-tête sobre', () => {
  it('date du jour, bonjour, un fait réel, poste et agence, et l’action principale', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
    expect(screen.getByText('Mardi 13 octobre 2026')).toBeVisible()
    expect(screen.getByText('2 postes correspondent déjà à votre profil.')).toBeVisible()
    expect(screen.getByText('Agent de crédit · Agence Démo Nord')).toBeVisible()
    expect(screen.getByRole('link', { name: /Déposer un certificat/ })).toHaveAttribute('href', '/certificats/deposer')
    expect(screen.queryByText(/Bienvenue sur votre espace/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Penseuse/)).not.toBeInTheDocument()
  })
})

describe('US-123 CA-02 — quatre tuiles chiffrées', () => {
  it('postes, certificats, candidature et dossier, chacun avec son lien', async () => {
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    const openings = within(tiles).getByRole('link', { name: /Postes pour vous/ })
    expect(openings).toHaveAttribute('href', '/carriere#postes-ouverts')
    expect(openings).toHaveTextContent('2')
    const certificates = within(tiles).getByRole('link', { name: /Mes certificats/ })
    expect(certificates).toHaveAttribute('href', '/certificats')
    expect(certificates).toHaveTextContent('1 validé sur 2')
    expect(certificates).toHaveTextContent('1 en examen')
    const application = within(tiles).getByRole('link', { name: /Ma candidature/ })
    // La tuile mène directement à « Mes candidatures », sans avoir à descendre.
    expect(application).toHaveAttribute('href', '/carriere#mes-candidatures')
    expect(application).toHaveTextContent('2 étape sur 7')
    expect(application).toHaveTextContent('Chargé de crédit · Étude par la DRH')
    const dossier = within(tiles).getByRole('link', { name: /Mon dossier/ })
    expect(dossier).toHaveAttribute('href', '/profil')
    expect(dossier).toHaveTextContent('100 %')
  })

  it('sans candidature en cours, la tuile de candidature disparaît', async () => {
    listMyApplications.mockResolvedValue({ items: [{ ...APPLICATION, step: 'CLOSED', outcome: 'REFUSED' }] })
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(within(tiles).queryByRole('link', { name: /Ma candidature/ })).not.toBeInTheDocument()
  })

  it('une donnée indisponible n’empêche pas l’accueil de s’afficher', async () => {
    listMyApplications.mockRejectedValue(new Error('hors connexion'))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Vos chiffres' })).getByRole('link', { name: /Mon dossier/ })).toBeVisible()
  })
})

describe('US-123 CA-03 — les postes ouverts pour moi', () => {
  it('sur téléphone, une carte par poste : critères et temps restant', async () => {
    renderPage()
    const list = await screen.findByRole('list', { name: 'Postes ouverts pour vous' })
    const [chef, analyste] = within(list).getAllByRole('listitem')
    expect(chef).toHaveTextContent("Chef d'agence adjoint")
    expect(chef).toHaveTextContent('Agence Démo Sud')
    expect(chef).toHaveTextContent('3 critères sur 3')
    expect(chef).toHaveTextContent('33 jours')
    expect(analyste).toHaveTextContent('Ouvert à tous')
    expect(analyste).toHaveTextContent('48 jours')
    expect(analyste).not.toHaveTextContent(/grade/i)
  })

  it('sur ordinateur, un tableau avec « Voir et postuler »', async () => {
    setDesktop(true)
    renderPage()
    const table = await screen.findByRole('table', { name: 'Postes ouverts pour vous' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('15 nov.')
    expect(within(rows[1]).getByRole('link', { name: /Voir et postuler/ })).toHaveAttribute('href', '/carriere#postes-ouverts')
  })
})

describe('US-123 CA-04 — à ne pas manquer', () => {
  it('les dates limites et la confirmation annuelle, les plus proches d’abord', async () => {
    renderPage()
    const dates = await screen.findByRole('list', { name: 'À ne pas manquer' })
    const items = within(dates).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/nov.*15.*Date limite.*Chef d'agence adjoint/),
      expect.stringMatching(/nov.*30.*Date limite.*Analyste crédit senior/),
      expect.stringMatching(/déc.*12.*Confirmer mon dossier/),
    ])
  })
})

describe('US-123 CA-05 — diplômes et parcours en chiffres', () => {
  it('invite à ajouter un diplôme et donne le parcours en chiffres, sans grade', async () => {
    renderPage()
    const diplomas = await screen.findByRole('region', { name: 'Vos diplômes travaillent pour vous' })
    expect(within(diplomas).getByRole('link', { name: /Ajouter un diplôme/ })).toHaveAttribute('href', '/certificats/deposer')
    const figures = screen.getByRole('region', { name: 'Mon parcours en chiffres' })
    expect(figures).toHaveTextContent('8 ans')
    expect(figures).toHaveTextContent('chez ACME SA')
    expect(figures).toHaveTextContent('Licence')
    expect(figures).toHaveTextContent('plus haut diplôme validé')
    expect(figures).toHaveTextContent('5')
    expect(figures).not.toHaveTextContent(/grade/i)
    expect(within(figures).getByRole('link', { name: /Voir la frise/ })).toHaveAttribute('href', '/carriere')
  })
})

describe('US-123 — premiers pas', () => {
  it('sans certificat ni parcours : pas de « 0 sur 0 », pas de chiffre vide, et l’année d’une date lointaine', async () => {
    listCertificates.mockResolvedValue({ certificates: [], limit: 10 })
    getMyCareer.mockResolvedValue({ kinds: [{ kind: 'EXPERIENCE', count: 0 }] })
    listMyOpenings.mockResolvedValue({ items: [] })
    getFreshness.mockResolvedValue({
      items: [{ key: 'telephone', label: 'Téléphone', value: '4812 0000', confirmed_at: '2026-10-13T09:00:00Z', expires_on: '2027-10-13', reminder_on: '2027-09-13', state: 'FRESH' }],
      stale_count: 0,
    })
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(within(tiles).getByRole('link', { name: /Mes certificats/ })).toHaveTextContent('0 certificat déposé')
    expect(screen.getByRole('region', { name: 'Mon parcours en chiffres' })).not.toHaveTextContent(/élément/)
    expect(within(screen.getByRole('list', { name: 'À ne pas manquer' })).getByRole('listitem')).toHaveTextContent('2027')
  })
})

describe('US-123 CA-06 — dossier incomplet', () => {
  it('le dossier passe en premier ; certificats et postes se débloquent après', async () => {
    getProfile.mockResolvedValue(profile(['emergency_contact', 'education_level', 'position_confirmed']))
    renderPage()
    expect(await screen.findByText('Plus que 3 informations, et vos diplômes pourront vous ouvrir de nouveaux postes.')).toBeVisible()
    const tiles = screen.getByRole('region', { name: 'Vos chiffres' })
    const links = within(tiles).getAllByRole('link')
    expect(links[0]).toHaveAccessibleName(/Mon dossier/)
    expect(links[0]).toHaveTextContent('5 sur 8')
    expect(within(tiles).getByText('Mes certificats').closest('div')).toHaveTextContent('Après le dossier')
    expect(screen.queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
    expect(listMyOpenings).not.toHaveBeenCalled()

    const remaining = screen.getByRole('region', { name: 'Il reste 3 informations à compléter' })
    expect(within(remaining).getByRole('link', { name: /Contact d'urgence.*Renseigner/ })).toHaveAttribute('href', '/profil/contact-etudes')
    expect(within(remaining).getByRole('link', { name: /Confirmer votre poste.*Confirmer/ })).toHaveAttribute('href', '/profil/informations-rh')
  })
})

describe('US-207 — ce qui ne change pas', () => {
  it('la barre du bas mène à Accueil, Mon profil, Mes certificats, Ma carrière', async () => {
    renderPage()
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/accueil', '/profil', '/certificats', '/carriere'])
    expect(within(nav).getByRole('link', { name: /Accueil/ })).toHaveAttribute('aria-current', 'page')
  })

  it('première connexion : « Avant de commencer » passe d’abord (écran 05)', async () => {
    getDossier.mockResolvedValue({ consent: { information_notice_at: null, whatsapp: null } })
    renderPage()
    expect(await screen.findByText('Avant de commencer, puis /accueil')).toBeVisible()
  })
})
