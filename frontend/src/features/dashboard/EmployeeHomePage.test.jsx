import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyCareer } from '../../api/career.js'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import { getDossier, getFreshness } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import { getMyNotifications } from '../../api/notifications.js'
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
      mission: "Seconder le chef d'agence dans l'animation de l'équipe et le suivi du portefeuille de crédit de l'agence.",
    },
    {
      id: 2,
      title: 'Analyste crédit senior',
      unit_label: 'Direction Démo des crédits',
      opens_on: '2026-10-01',
      closes_on: '2026-11-30',
      criteria_lines: [],
      mission: 'Analyser les demandes de crédit importantes.',
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
  getMyNotifications.mockResolvedValue({ items: [], unread_count: 0, has_more: false })
})

afterEach(() => {
  setDesktop(false)
  vi.useRealTimers()
})

describe('US-128 CA-01 — en-tête de la refonte', () => {
  it('bonjour, la phrase de bienvenue, l’action principale et le bandeau illustré ; ni date, ni poste, ni emoji', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
    expect(
      screen.getByText(
        'Bienvenue sur votre espace carrière. Ici, vous pouvez suivre vos dossiers, consulter les opportunités et gérer vos documents.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: /Déposer un certificat/ })).toHaveAttribute('href', '/certificats/deposer')
    expect(screen.getByText('Votre engagement d’aujourd’hui construit votre avenir chez ACME SA.')).toBeVisible()
    expect(screen.queryByText('Mardi 13 octobre 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Agent de crédit · Agence Démo Nord')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('US-136 CA-02 — à faire', () => {
  it('rien à faire : pas de section « À faire »', async () => {
    renderPage()
    await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(screen.queryByRole('region', { name: 'À faire' })).not.toBeInTheDocument()
  })

  it('la confirmation annuelle et chaque certificat à corriger, avec « Corriger »', async () => {
    getFreshness.mockResolvedValue({
      items: [{ key: 'telephone', label: 'Téléphone', value: '4812 0000', confirmed_at: '2025-10-01T09:00:00Z', expires_on: '2026-10-01', reminder_on: '2026-09-01', state: 'STALE' }],
      stale_count: 1,
    })
    listCertificates.mockResolvedValue({
      certificates: [
        { id: 'a', status: 'VALIDATED', level: 'LICENCE', level_label: 'Licence', title: 'Licence en Gestion' },
        { id: 'c', status: 'TO_CORRECT', level: 'LICENCE', level_label: 'Licence', title: 'Licence en Finance' },
      ],
      limit: 10,
    })
    renderPage()
    const todo = await screen.findByRole('region', { name: 'À faire' })
    expect(within(todo).getByRole('heading', { name: 'Ces informations sont-elles toujours exactes ?' })).toBeVisible()
    expect(todo).toHaveTextContent('Certificat à corriger : Licence en Finance')
    expect(within(todo).getByRole('link', { name: /Corriger/ })).toHaveAttribute('href', '/certificats/deposer?remplace=c')
    expect(todo).not.toHaveTextContent('Licence en Gestion')
  })
})

describe('US-136 CA-03 — trois tuiles au plus, sans phrase', () => {
  it('postes, certificats et candidature, chacun avec son lien ; plus de tuile « Mon dossier »', async () => {
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(within(tiles).getAllByRole('link')).toHaveLength(3)
    const openings = within(tiles).getByRole('link', { name: /Postes pour vous/ })
    expect(openings).toHaveAttribute('href', '/carriere#postes-ouverts')
    expect(openings).toHaveTextContent('2')
    const certificates = within(tiles).getByRole('link', { name: /Mes certificats/ })
    expect(certificates).toHaveAttribute('href', '/certificats')
    expect(certificates).toHaveTextContent('1 validé sur 2')
    const application = within(tiles).getByRole('link', { name: /Ma candidature/ })
    expect(application).toHaveAttribute('href', '/carriere#mes-candidatures')
    expect(application).toHaveTextContent('2 étape sur 7')
    expect(within(tiles).queryByRole('link', { name: /Mon dossier/ })).not.toBeInTheDocument()
    expect(tiles).not.toHaveTextContent(/il ne reste qu’à postuler|Chaque diplôme validé|À jour : les RH|Chargé de crédit/)
  })

  it('sans candidature en cours, la tuile de candidature disparaît', async () => {
    listMyApplications.mockResolvedValue({ items: [{ ...APPLICATION, step: 'CLOSED', outcome: 'REFUSED' }] })
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(within(tiles).queryByRole('link', { name: /Ma candidature/ })).not.toBeInTheDocument()
    expect(within(tiles).getAllByRole('link')).toHaveLength(2)
  })

  it('une donnée indisponible n’empêche pas l’accueil de s’afficher', async () => {
    listMyApplications.mockRejectedValue(new Error('hors connexion'))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Vos chiffres' })).getByRole('link', { name: /Mes certificats/ })).toBeVisible()
  })

  it('sans certificat : pas de « 0 sur 0 »', async () => {
    listCertificates.mockResolvedValue({ certificates: [], limit: 10 })
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    expect(within(tiles).getByRole('link', { name: /Mes certificats/ })).toHaveTextContent('0 certificat déposé')
  })
})

describe('US-128 CA-03 — le poste ouvert pour vous', () => {
  it('met en avant le poste dont la date limite est la plus proche, avec ses critères et sa mission', async () => {
    renderPage()
    const panel = await screen.findByRole('region', { name: 'Poste ouvert pour vous' })
    expect(panel).toHaveTextContent("Chef d'agence adjoint")
    expect(panel).toHaveTextContent('Vous remplissez les 3 critères')
    expect(panel).toHaveTextContent('Agence Démo Sud')
    expect(panel).toHaveTextContent('15 nov.')
    expect(panel).toHaveTextContent('reste 33 jours')
    expect(panel).toHaveTextContent("Seconder le chef d'agence")
    expect(panel).not.toHaveTextContent('Analyste crédit senior')
    expect(within(panel).getByRole('link', { name: /Voir le poste et postuler/ })).toHaveAttribute('href', '/carriere#poste-1') // US-131 CA-04
    expect(within(panel).getByRole('link', { name: 'Voir les 2 postes' })).toHaveAttribute('href', '/carriere#postes-ouverts')
    expect(panel).not.toHaveTextContent(/grade/i)
  })

  it('un poste ouvert à tous, sans lien vers les autres', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENINGS.items[1]] })
    renderPage()
    const panel = await screen.findByRole('region', { name: 'Poste ouvert pour vous' })
    expect(panel).toHaveTextContent('Ouvert à tous')
    expect(within(panel).queryByRole('link', { name: /Voir les/ })).not.toBeInTheDocument()
  })

  it('aucun poste : une phrase le dit', async () => {
    listMyOpenings.mockResolvedValue({ items: [] })
    renderPage()
    expect(await screen.findByText(/Aucun poste ouvert pour vous en ce moment/)).toBeVisible()
  })
})

describe('US-136 CA-05 — ce qui quitte l’accueil', () => {
  it('ni « Activité récente », ni « Dates à retenir », ni les anciennes sections ; la page prend toute la largeur', async () => {
    setDesktop(true)
    renderPage()
    await screen.findByRole('region', { name: 'Poste ouvert pour vous' })
    expect(screen.queryByRole('region', { name: 'Activité récente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'À ne pas manquer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Dates à retenir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Nouveau pour vous' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mon parcours en chiffres' })).not.toBeInTheDocument()
    expect(getMyNotifications).not.toHaveBeenCalledWith({ limit: 3 })
    expect(getMyCareer).not.toHaveBeenCalled()
  })
})

describe('US-123 CA-06, US-136 CA-06 — dossier incomplet', () => {
  it('le dossier passe en premier ; certificats et postes se débloquent après ; pas d’activité récente', async () => {
    getProfile.mockResolvedValue(profile(['emergency_contact', 'education_level', 'position_confirmed']))
    renderPage()
    const tiles = await screen.findByRole('region', { name: 'Vos chiffres' })
    const links = within(tiles).getAllByRole('link')
    expect(links[0]).toHaveAccessibleName(/Mon dossier/)
    expect(links[0]).toHaveTextContent('5 sur 8')
    expect(within(tiles).getByText('Mes certificats').closest('div')).toHaveTextContent('Après le dossier')
    expect(screen.queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
    expect(listMyOpenings).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Activité récente' })).not.toBeInTheDocument()

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
