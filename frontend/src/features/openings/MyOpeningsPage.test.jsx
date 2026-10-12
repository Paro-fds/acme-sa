import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyCareer } from '../../api/career.js'
import { listCertificates } from '../../api/certificates.js'
import { ApiError } from '../../api/client.js'
import { getProfile } from '../../api/employee.js'
import { applyToOpening, listMyApplications, listMyOpenings, sendCv, withdrawApplication } from '../../api/openings.js'
import { setDesktop } from '../../lib/testViewport.js'
import MyOpeningsPage from './MyOpeningsPage.jsx'

vi.mock('../../api/openings.js', () => ({
  listMyOpenings: vi.fn(),
  listMyApplications: vi.fn(),
  applyToOpening: vi.fn(),
  withdrawApplication: vi.fn(),
  sendCv: vi.fn(),
}))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn(), adminLogout: vi.fn() }))
vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/career.js', () => ({ getMyCareer: vi.fn() }))
vi.mock('../../api/certificates.js', () => ({ listCertificates: vi.fn() }))

const PROFILE = {
  first_name: 'Jean',
  last_name: 'JOSEPH',
  position: 'Agent de crédit',
  affectation: { agency: 'Agence Démo Nord' },
  hire_date: '2018-09-03',
  photo_url: null,
}

const CAREER = {
  kinds: [
    {
      kind: 'EXPERIENCE',
      items: [{ id: 'e1', kind: 'EXPERIENCE', title: 'Caissier', organization: 'Coopérative Démo', location: null, start_month: '2016-01', end_month: '2018-08', duration_hours: null, description: null }],
    },
    { kind: 'SKILL', items: [{ id: 's1', kind: 'SKILL', title: 'Excel', skill_level_label: 'Avancé' }] },
  ],
}

const CERTIFICATES = {
  certificates: [
    { id: 'c1', title: 'Licence en sciences comptables', type_label: 'Diplôme', institution: 'Université Démo', year: 2019, status: 'VALIDATED', is_archived: false },
  ],
}

const OPENING = {
  id: 7,
  code: 'CC-2026-01',
  title: 'Chargé de crédit',
  unit_label: 'Agence Démo',
  target_grade: '12',
  mission: "Instruire les demandes de crédit de l'agence.",
  opens_on: '2026-10-01',
  closes_on: '2026-11-15',
  criteria_lines: ["Niveau d'études minimum : Licence", 'Domaine : Finance'],
}

const step = (code, label, at, outcome = null) => ({ step: code, step_label: label, outcome_label: outcome, at })

const APPLICATION = {
  cv: { name: 'cv-jean.pdf', content_type: 'application/pdf', size_bytes: 2048 },
  id: 3,
  reference: 'CAND-00003',
  opening_id: 7,
  opening_code: 'CC-2026-01',
  opening_title: 'Chargé de crédit',
  motivation: 'Je connais bien le crédit.',
  received_at: '2026-10-04T09:00:00Z',
  step: 'DRH_REVIEW',
  step_label: 'Étude par la DRH',
  step_number: 2,
  outcome: null,
  outcome_label: null,
  can_withdraw: true,
  history: [
    step('RECEIVED', 'Reçue et enregistrée', '2026-10-04T09:00:00Z'),
    step('DRH_REVIEW', 'Étude par la DRH', '2026-10-05T09:00:00Z'),
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/carriere']}>
      <MyOpeningsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listMyApplications.mockResolvedValue({ items: [] })
  listMyOpenings.mockResolvedValue({ items: [] })
  getProfile.mockResolvedValue(PROFILE)
  getMyCareer.mockResolvedValue(CAREER)
  listCertificates.mockResolvedValue(CERTIFICATES)
})

afterEach(() => setDesktop(false))

describe('US-114 — retracer mon parcours dans Ma carrière', () => {
  it('CA-01 : « Aujourd’hui » donne le poste, l’agence et l’ancienneté', async () => {
    renderPage()
    const today = await screen.findByRole('region', { name: 'Aujourd’hui' })
    expect(today).toHaveTextContent('Agent de crédit · Agence Démo Nord')
    expect(today).toHaveTextContent(/\d+ ans chez ACME SA/)
  })

  it('CA-02 : la frise, du plus récent au plus ancien, avec la source de chaque élément', async () => {
    renderPage()
    const frise = await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    const items = within(frise).getAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Licence en sciences comptables',
      'Entrée chez ACME SA',
      'Caissier',
    ])
    expect(items[0]).toHaveTextContent('Validé par les RH')
    expect(items[1]).toHaveTextContent('Système RH')
    expect(items[2]).toHaveTextContent('Déclaré par vous')
    expect(screen.getByRole('list', { name: 'Compétences' })).toHaveTextContent('Excel')
  })

  it('CA-03 : un filtre réduit la frise', async () => {
    const user = userEvent.setup()
    renderPage()
    const frise = await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    await user.click(screen.getByRole('button', { name: 'Chez ACME' }))
    expect(screen.getByRole('button', { name: 'Chez ACME' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(frise).getAllByRole('article')).toHaveLength(1)
    expect(frise).toHaveTextContent('Entrée chez ACME SA')
  })

  it('CA-04 : sur ordinateur, les postes ouverts sont dans la colonne de droite', async () => {
    setDesktop(true)
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage()
    const side = await screen.findByRole('complementary', { name: 'Postes et candidatures' })
    expect(await within(side).findByRole('list', { name: 'Postes ouverts pour vous' })).toBeInTheDocument()
  })

  it('frise sans élément : invitation à déposer un certificat', async () => {
    getProfile.mockResolvedValue({ ...PROFILE, hire_date: null })
    getMyCareer.mockResolvedValue({ kinds: [] })
    listCertificates.mockResolvedValue({ certificates: [] })
    renderPage()
    const invite = await screen.findByText(/Votre parcours se construit avec vos certificats/)
    expect(within(invite.closest('div')).getByRole('link', { name: 'Déposer un certificat' })).toHaveAttribute('href', '/certificats/deposer')
  })

  it('la frise ne se charge pas : les postes restent affichés', async () => {
    getMyCareer.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Parcours indisponible.'))
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage()
    expect(await screen.findByText('Parcours indisponible.')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Postes ouverts pour vous' })).toBeInTheDocument()
  })
})

describe('US-801 — postes ouverts pour l’employé apte', () => {
  it('montre chaque poste, son unité, sa date limite, sa mission et ses critères', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage()
    const list = await screen.findByRole('list', { name: 'Postes ouverts pour vous' })
    const [item] = within(list).getAllByRole('listitem')
    expect(within(item).getByRole('heading', { name: 'Chargé de crédit' })).toBeInTheDocument()
    expect(item).toHaveTextContent('Agence Démo')
    expect(item).toHaveTextContent('Candidatures jusqu’au 15/11/2026')
    expect(item).toHaveTextContent("Instruire les demandes de crédit de l'agence.")
    expect(within(item).getByText('Domaine : Finance')).toBeInTheDocument()
    expect(screen.getByText(/Vous remplissez les critères de ce poste/)).toBeInTheDocument()
  })

  it('aucun poste : encourage à compléter son profil et ses certificats', async () => {
    listMyOpenings.mockResolvedValue({ items: [] })
    renderPage()
    expect(await screen.findByText('Aucun poste ouvert ne correspond à votre profil pour le moment.')).toBeInTheDocument()
    const advice = screen.getByText(/Chaque certificat validé peut vous ouvrir de nouveaux postes/)
    expect(within(advice).getByRole('link', { name: 'Mes certificats' })).toHaveAttribute('href', '/certificats')
  })
})

describe('US-902 — déposer et suivre sa candidature', () => {
  it('postuler avec un message, puis voir l’accusé de réception et le numéro de suivi', async () => {
    const user = userEvent.setup()
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    applyToOpening.mockResolvedValue({ ...APPLICATION, step: 'RECEIVED', step_label: 'Reçue et enregistrée', step_number: 1 })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Postuler' }))
    await user.type(screen.getByLabelText('Votre message aux RH (facultatif)'), 'Je connais bien le crédit.')
    listMyApplications.mockResolvedValue({ items: [{ ...APPLICATION, step: 'RECEIVED', step_label: 'Reçue et enregistrée' }] })
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))

    expect(applyToOpening).toHaveBeenCalledWith(7, 'Je connais bien le crédit.', null)
    expect(sendCv).not.toHaveBeenCalled()
    expect(await screen.findByText(/Candidature reçue le 04\/10\/2026/)).toBeInTheDocument()
    expect(screen.getAllByText(/CAND-00003/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Postuler' })).not.toBeInTheDocument()
  })

  it('joindre son CV : il est envoyé avant la candidature', async () => {
    const user = userEvent.setup()
    const cv = new File(['%PDF-1.7'], 'cv-jean.pdf', { type: 'application/pdf' })
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    sendCv.mockResolvedValue({ uploadId: 'u1', name: 'cv-jean.pdf' })
    applyToOpening.mockResolvedValue({ ...APPLICATION, cv: { name: 'cv-jean.pdf', content_type: 'application/pdf', size_bytes: 8 } })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Postuler' }))
    await user.upload(screen.getByLabelText('Votre CV (facultatif)'), cv)
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))
    expect(sendCv).toHaveBeenCalledWith(cv)
    expect(applyToOpening).toHaveBeenCalledWith(7, '', { uploadId: 'u1', name: 'cv-jean.pdf' })
  })

  it('un refus du portail s’affiche près du bouton', async () => {
    const user = userEvent.setup()
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    applyToOpening.mockRejectedValue(new ApiError(409, 'PROFILE_INCOMPLETE', 'Complétez votre profil avant de postuler.'))
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Postuler' }))
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Complétez votre profil avant de postuler.')
  })

  it('CA-02 : « Mes candidatures » montre l’étape en cours et l’historique', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    listMyApplications.mockResolvedValue({ items: [APPLICATION] })
    renderPage()
    const list = await screen.findByRole('list', { name: 'Mes candidatures' })
    const [item] = within(list).getAllByRole('listitem', { name: /Chargé de crédit/ })
    expect(item).toHaveTextContent('N° CAND-00003')
    expect(item).toHaveTextContent('CV joint : cv-jean.pdf')
    expect(item).toHaveTextContent('Étape 2 sur 7 : Étude par la DRH')
    expect(within(item).getByRole('list', { name: 'Étapes' })).toHaveTextContent('Reçue et enregistrée — 04/10/2026')
    // Le poste montre que la candidature est déjà envoyée.
    expect(screen.queryByRole('button', { name: 'Postuler' })).not.toBeInTheDocument()
  })

  it('retirer sa candidature, après confirmation', async () => {
    const user = userEvent.setup()
    listMyOpenings.mockResolvedValue({ items: [] })
    listMyApplications.mockResolvedValue({ items: [APPLICATION] })
    withdrawApplication.mockResolvedValue({ ...APPLICATION, step: 'CLOSED', step_label: 'Clôturée', outcome_label: 'Retirée', can_withdraw: false })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Retirer ma candidature' }))
    listMyApplications.mockResolvedValue({
      items: [{ ...APPLICATION, step: 'CLOSED', step_label: 'Clôturée', step_number: 7, outcome_label: 'Retirée', can_withdraw: false }],
    })
    await user.click(screen.getByRole('button', { name: 'Oui, retirer' }))
    expect(withdrawApplication).toHaveBeenCalledWith(3)
    expect(await screen.findByText(/Clôturée · Retirée/)).toBeInTheDocument()
  })
})
