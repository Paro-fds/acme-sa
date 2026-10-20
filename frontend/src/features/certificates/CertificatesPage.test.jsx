import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProfile } from '../../api/employee.js'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import CertificatesPage from './CertificatesPage.jsx'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/certificates.js', () => ({
  listCertificates: vi.fn(),
  getCertificateForm: vi.fn(),
  certificateFileUrl: (id) => `/api/me/certificates/${id}/file`,
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
    getCertificateForm.mockResolvedValue({ max_mb: 5 })
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

const BASE = {
  type_label: 'Diplôme',
  level_label: 'Licence',
  domain_label: null,
  institution: 'Université Démo',
  year: 2019,
  submitted_at: '2026-10-08T09:00:00Z',
  decided_at: null,
  rejection_reason: null,
  rejection_comment: null,
  answer_by: null,
  is_archived: false,
}

const CORRECT = {
  ...BASE,
  id: 'c4',
  title: 'Attestation de formation en microfinance',
  type_label: 'Attestation',
  level_label: 'Formation',
  year: 2024,
  submitted_at: '2026-10-02T09:00:00Z',
  status: 'TO_CORRECT',
  decided_at: '2026-10-05T09:00:00Z',
  rejection_reason: 'Document illisible ou de mauvaise qualité',
  rejection_comment: 'La photo est floue, le nom de l’organisme ne se lit pas.',
}
const REVIEW = { ...BASE, id: 'c2', title: 'Certificat Excel avancé', status: 'IN_REVIEW', submitted_at: '2026-10-15T09:00:00Z', answer_by: '2026-10-22' }
const RECEIVED = { ...BASE, id: 'c1', title: 'Baccalauréat', status: 'RECEIVED', answer_by: '2026-10-15' }
const VALIDATED = {
  ...BASE,
  id: 'c3',
  title: 'Licence en sciences comptables',
  domain_label: 'Comptabilité',
  status: 'VALIDATED',
  decided_at: '2026-10-12T15:00:00Z',
}
const ARCHIVED = { ...CORRECT, id: 'c0', title: 'Ancienne attestation', is_archived: true }

const list = () => screen.findByRole('list', { name: 'Certificats déposés' })
const card = (title) => screen.getByRole('heading', { name: title, level: 3 }).closest('li')

describe('US-130 — Mes certificats de la refonte', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfile.mockResolvedValue({ completion: completion([]) })
    getCertificateForm.mockResolvedValue({ max_mb: 5 })
    listCertificates.mockResolvedValue({ certificates: [CORRECT, REVIEW, RECEIVED, VALIDATED, ARCHIVED], limit: 20, validated_level: 'Licence' })
  })

  it('CA-01 : en-tête, action principale et bandeau illustré, sans emoji', async () => {
    renderPage()
    await list()

    expect(screen.getByRole('heading', { name: 'Mes certificats', level: 2 })).toBeVisible()
    expect(
      screen.getByText('Déposez vos diplômes et attestations. Les RH les vérifient, puis ils comptent pour les postes qui vous sont proposés.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: /Déposer un certificat/ })).toHaveAttribute('href', '/certificats/deposer')
    expect(screen.getByText('Chaque diplôme validé peut vous ouvrir de nouveaux postes.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('CA-02 : le niveau d’études validé', async () => {
    renderPage()
    await list()

    const level = screen.getByRole('region', { name: "Niveau d'études validé" })
    expect(level).toHaveTextContent('Licence')
    expect(level).toHaveTextContent('Établi par vos certificats validés par les RH')
  })

  it('CA-02 : aucun niveau validé pour l’instant ; aucun certificat, le dépôt reste proposé', async () => {
    listCertificates.mockResolvedValue({ certificates: [], limit: 20, validated_level: null })
    renderPage()

    expect(await screen.findByText("Aucun certificat déposé pour l'instant.")).toBeVisible()
    expect(screen.getByRole('region', { name: "Niveau d'études validé" })).toHaveTextContent("Aucun pour l'instant")
    expect(screen.getByRole('link', { name: /Déposer un certificat/ })).toBeVisible()
  })

  it('CA-03 : les filtres et leur nombre ; un certificat remplacé seulement dans « Tous »', async () => {
    const user = userEvent.setup()
    renderPage()
    const titles = () =>
      within(screen.getByRole('list', { name: 'Certificats déposés' }))
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    await list()

    const filters = screen.getByRole('group', { name: 'Filtrer mes certificats' })
    expect(within(filters).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Tous · 5',
      'Validés · 1',
      'En cours d’examen · 2',
      'À corriger · 1',
    ])
    expect(within(filters).getByRole('button', { name: 'Tous · 5' })).toHaveAttribute('aria-pressed', 'true')
    expect(card('Ancienne attestation')).toHaveTextContent('Archivé (remplacé)')

    await user.click(within(filters).getByRole('button', { name: 'En cours d’examen · 2' }))
    expect(titles()).toEqual(['Certificat Excel avancé', 'Baccalauréat'])

    await user.click(within(filters).getByRole('button', { name: 'À corriger · 1' }))
    expect(titles()).toEqual(['Attestation de formation en microfinance'])
  })

  it('CA-04 : en examen, l’avancement et la date limite de réponse', async () => {
    renderPage()
    await list()

    const review = card('Certificat Excel avancé')
    expect(review).toHaveTextContent('Diplôme · Licence · 2019 · déposé le 15 oct. 2026')
    expect(review).toHaveTextContent('En vérification')
    const steps = within(review).getByRole('list', { name: 'Avancement' })
    expect(within(steps).getAllByRole('listitem').map((step) => step.textContent)).toEqual(['Reçu', 'En cours d’examen', 'Décision'])
    expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
    expect(review).toHaveTextContent('Réponse des RH sous 5 jours ouvrables, au plus tard le 22 oct.')
    const received = within(card('Baccalauréat')).getByRole('list', { name: 'Avancement' })
    expect(within(received).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
  })

  it('CA-04 : validé, la date de validation et le fichier', async () => {
    renderPage()
    await list()

    const validated = card('Licence en sciences comptables')
    expect(validated).toHaveTextContent('Diplôme · Licence · Comptabilité · 2019')
    expect(validated).toHaveTextContent('Validé par les RH le 12 oct. 2026')
    const file = within(validated).getByRole('link', { name: 'Voir le fichier de Licence en sciences comptables' })
    expect(file).toHaveAttribute('href', '/api/me/certificates/c3/file')
    expect(file).toHaveAttribute('target', '_blank')
  })

  it('CA-05 : à corriger, le message des RH et « Corriger et renvoyer »', async () => {
    renderPage()
    await list()

    const correct = card('Attestation de formation en microfinance')
    expect(correct).toHaveTextContent(
      'Message des RH : Document illisible ou de mauvaise qualité. La photo est floue, le nom de l’organisme ne se lit pas.',
    )
    expect(within(correct).getByRole('link', { name: 'Corriger et renvoyer' })).toHaveAttribute('href', '/certificats/deposer?remplace=c4')
    expect(within(card('Ancienne attestation')).queryByRole('link', { name: 'Corriger et renvoyer' })).not.toBeInTheDocument()
  })

  it('US-118 : chaque certificat, archivé compris, ouvre son fichier', async () => {
    renderPage()
    await list()

    expect(within(card('Ancienne attestation')).getByRole('link', { name: /Voir le fichier/ })).toHaveAttribute('href', '/api/me/certificates/c0/file')
    expect(within(card('Baccalauréat')).getByRole('link', { name: /Voir le fichier/ })).toHaveAttribute('href', '/api/me/certificates/c1/file')
  })

  it('CA-07 : comment ça marche, les fichiers acceptés, à qui poser une question', async () => {
    renderPage()
    await list()

    const how = screen.getByRole('region', { name: 'Comment ça marche' })
    expect(within(how).getAllByRole('listitem').map((step) => step.textContent)).toEqual([
      '1Vous déposezUne photo ou un PDF, depuis votre téléphone',
      '2Les RH vérifientEn 5 jours ouvrables au plus',
      '3Il compte pour vousVotre niveau est mis à jour et de nouveaux postes peuvent s’ouvrir',
    ])
    expect(screen.getByRole('region', { name: 'Fichiers acceptés' })).toHaveTextContent(
      'PDF, JPG ou PNG, 5 Mo au plus. Une photo nette, à plat, bien éclairée.',
    )
    expect(screen.getByRole('region', { name: 'Une question sur vos documents ?' })).toHaveTextContent(
      'Adressez-vous au service RH de votre agence.',
    )
  })

  it('CA-07 : sur ordinateur, l’aide est dans la colonne de droite', async () => {
    const { setDesktop } = await import('../../lib/testViewport.js')
    setDesktop(true)
    try {
      renderPage()
      await list()
      const side = screen.getByRole('complementary', { name: 'Comment ça marche' })
      expect(within(side).getByRole('region', { name: 'Fichiers acceptés' })).toBeInTheDocument()
    } finally {
      setDesktop(false)
    }
  })

  it('US-301 CA-04 : au maximum de certificats, le dépôt n’est plus proposé', async () => {
    listCertificates.mockResolvedValue({ certificates: [RECEIVED, REVIEW], limit: 2, validated_level: null })
    renderPage()

    expect(await screen.findByText('Vous avez déposé 2 certificats, le nombre maximum.')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Déposer un certificat/ })).not.toBeInTheDocument()
  })
})
