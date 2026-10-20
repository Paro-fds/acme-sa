import { render, screen, waitFor, within } from '@testing-library/react'
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
    { id: 'c2', title: 'Certificat Excel avancé', type_label: 'Formation', institution: 'Centre Démo', year: 2025, status: 'IN_REVIEW', is_archived: false },
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
const OPEN_TO_ALL = { ...OPENING, id: 8, title: 'Caissier principal', unit_label: 'Siège', closes_on: '2026-12-31', criteria_lines: [] }

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
  step: 'MANAGER',
  step_label: 'Consultation du responsable du département',
  step_number: 3,
  outcome: null,
  outcome_label: null,
  can_withdraw: true,
  history: [
    step('RECEIVED', 'Reçue et enregistrée', '2026-10-04T09:00:00Z'),
    step('DRH_REVIEW', 'Étude par la DRH', '2026-10-07T09:00:00Z'),
    step('MANAGER', 'Consultation du responsable du département', '2026-10-10T09:00:00Z'),
  ],
}

function renderPage(path = '/carriere') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MyOpeningsPage />
    </MemoryRouter>,
  )
}

const card = (title) => screen.findByRole('article', { name: title })
async function open(title) {
  const user = userEvent.setup()
  const article = await card(title)
  await user.click(within(article).getByRole('button', { name: /Voir le poste/ }))
  return { user, article }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-19T12:00:00'))
  listMyApplications.mockResolvedValue({ items: [] })
  listMyOpenings.mockResolvedValue({ items: [] })
  getProfile.mockResolvedValue(PROFILE)
  getMyCareer.mockResolvedValue(CAREER)
  listCertificates.mockResolvedValue(CERTIFICATES)
})

afterEach(() => {
  vi.useRealTimers()
  setDesktop(false)
})

describe('US-131 CA-01 — en-tête de la refonte', () => {
  it('titre, phrase et bandeau illustré, sans emoji', async () => {
    renderPage()
    await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    expect(screen.getByRole('heading', { name: 'Ma carrière', level: 2 })).toBeVisible()
    expect(
      screen.getByText('Votre parcours, de vos études à aujourd’hui, les postes ouverts pour vous et le suivi de vos candidatures.'),
    ).toBeVisible()
    expect(screen.getByText('Chaque étape de votre parcours compte pour la suivante.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('US-131 CA-02 — la frise du parcours', () => {
  it('« Aujourd’hui » en tête : le poste, l’agence et l’ancienneté', async () => {
    renderPage()
    const frise = await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    const today = within(frise).getAllByRole('listitem')[0]
    expect(today).toHaveTextContent('Aujourd’hui')
    expect(today).toHaveTextContent('Agent de crédit')
    expect(today).toHaveTextContent('Agence Démo Nord · 8 ans chez ACME SA')
  })

  it('du plus récent au plus ancien : la date à gauche, d’où vient l’élément et sa source', async () => {
    renderPage()
    const frise = await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    const items = within(frise).getAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Certificat Excel avancé',
      'Licence en sciences comptables',
      'Entrée chez ACME SA',
      'Caissier',
    ])
    const dates = within(frise).getAllByRole('listitem').map((item) => item.querySelector('[data-date]')?.textContent)
    expect(dates).toEqual(['Aujourd’hui', '2025', '2019', 'Sept. 2018', '2016'])
    expect(items[0]).toHaveTextContent('Hors ACME · Formation')
    expect(items[0]).toHaveTextContent('En cours d’examen')
    expect(items[1]).toHaveTextContent('Hors ACME · Diplôme')
    expect(items[1]).toHaveTextContent('Validé par les RH')
    expect(items[2]).toHaveTextContent('Chez ACME')
    expect(items[2]).toHaveTextContent('Système RH')
    expect(items[3]).toHaveTextContent('Hors ACME · Expérience')
    expect(items[3]).toHaveTextContent('Déclaré par vous')
    expect(screen.getByRole('list', { name: 'Compétences' })).toHaveTextContent('Excel')
  })

  it('un filtre réduit la frise ; « Aujourd’hui » reste dans « Chez ACME »', async () => {
    const user = userEvent.setup()
    renderPage()
    const frise = await screen.findByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })
    const filters = screen.getByRole('group', { name: 'Filtrer la frise' })
    await user.click(within(filters).getByRole('button', { name: 'Chez ACME' }))
    expect(within(filters).getByRole('button', { name: 'Chez ACME' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(frise).getAllByRole('article')).toHaveLength(1)
    expect(frise).toHaveTextContent('Aujourd’hui')
    await user.click(within(filters).getByRole('button', { name: 'Hors ACME' }))
    expect(frise).not.toHaveTextContent('Aujourd’hui')
  })

  it('Formations et Expériences : pas de filtre qui mène à une catégorie vide', async () => {
    renderPage()
    const filters = await screen.findByRole('group', { name: 'Filtrer la frise' })
    expect(within(filters).getByRole('button', { name: 'Expériences' })).toBeInTheDocument()
    expect(within(filters).queryByRole('button', { name: 'Formations' })).not.toBeInTheDocument()
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

describe('US-131 CA-03 — les postes en petites cartes, à déplier', () => {
  it('chaque poste : intitulé, unité, jours restants, critères remplis ; le détail est replié', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING, OPEN_TO_ALL] })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Postes ouverts pour vous · 2' })).toBeInTheDocument()
    const article = await card('Chargé de crédit')
    expect(article).toHaveTextContent('Agence Démo · reste 27 jours')
    expect(article).toHaveTextContent('2 critères sur 2')
    expect(article).not.toHaveTextContent("Instruire les demandes de crédit de l'agence.")
    expect(within(article).getByRole('button', { name: 'Voir le poste et postuler' })).toHaveAttribute('aria-expanded', 'false')
    expect(await card('Caissier principal')).toHaveTextContent('Ouvert à tous')
  })

  it('une date limite lointaine (plus de 90 jours) se donne en date', async () => {
    listMyOpenings.mockResolvedValue({ items: [{ ...OPENING, closes_on: '2099-12-31' }] })
    renderPage()
    expect(await card('Chargé de crédit')).toHaveTextContent('Agence Démo · jusqu’au 31/12/2099')
  })

  it('« Voir le poste et postuler » déplie la date limite, la mission et les critères (US-801), sans grade (US-122)', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage()
    const { article } = await open('Chargé de crédit')
    expect(within(article).getByRole('button', { name: 'Masquer le poste' })).toHaveAttribute('aria-expanded', 'true')
    expect(article).toHaveTextContent('Candidatures jusqu’au 15/11/2026')
    expect(article).toHaveTextContent("Instruire les demandes de crédit de l'agence.")
    expect(within(article).getByText('Domaine : Finance')).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: 'Postuler' })).toBeInTheDocument()
    expect(article).not.toHaveTextContent(/grade 12/)
  })

  it('US-119 : un poste du catalogue déplié montre son département, ses compétences et ses rubriques', async () => {
    listMyOpenings.mockResolvedValue({
      items: [
        {
          ...OPENING,
          profile_department: 'Crédit',
          competences: ['Analyse des dossiers de prêt', 'Suivi du portefeuille'],
          sections: [{ title: 'Missions', lines: ['Rechercher de nouveaux clients'] }],
        },
      ],
    })
    renderPage()
    const { user, article } = await open('Chargé de crédit')
    expect(within(article).getByText('Crédit')).toBeInTheDocument()
    expect(within(within(article).getByRole('list', { name: 'Compétences' })).getByText('Analyse des dossiers de prêt')).toBeVisible()
    expect(within(article).getByText('Rechercher de nouveaux clients')).not.toBeVisible()
    await user.click(within(article).getByText('Missions'))
    expect(within(article).getByText('Rechercher de nouveaux clients')).toBeVisible()
  })

  it('aucun poste : encourage à déposer ses certificats', async () => {
    renderPage()
    expect(await screen.findByText('Aucun poste ouvert ne correspond à votre profil pour le moment.')).toBeInTheDocument()
    const advice = screen.getByText(/Chaque certificat validé peut vous ouvrir de nouveaux postes/)
    expect(within(advice).getByRole('link', { name: 'Mes certificats' })).toHaveAttribute('href', '/certificats')
  })

  it('CA-06 : sur ordinateur, les postes sont dans la colonne de droite', async () => {
    setDesktop(true)
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage()
    const side = await screen.findByRole('complementary', { name: 'Postes et candidatures' })
    expect(await within(side).findByRole('list', { name: 'Postes ouverts pour vous' })).toBeInTheDocument()
  })
})

describe('US-131 CA-04 — arriver directement sur un poste', () => {
  it('« #poste-7 » ouvre la carte du poste et y place le focus', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPEN_TO_ALL, OPENING] })
    renderPage('/carriere#poste-7')
    const article = await card('Chargé de crédit')
    expect(within(article).getByRole('button', { name: 'Masquer le poste' })).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(within(article).getByRole('heading', { name: 'Chargé de crédit' })).toHaveFocus())
    expect(within(await card('Caissier principal')).getByRole('button', { name: 'Voir le poste et postuler' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('« #mes-candidatures » descend jusqu’à « Mes candidatures » et y place le focus', async () => {
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    listMyApplications.mockResolvedValue({ items: [APPLICATION] })
    renderPage('/carriere#mes-candidatures')
    const heading = await screen.findByRole('heading', { name: 'Mes candidatures' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalled()
    delete window.HTMLElement.prototype.scrollIntoView
  })

  it('« #postes-ouverts » place le focus sur « Postes ouverts pour vous »', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    renderPage('/carriere#postes-ouverts')
    const heading = await screen.findByRole('heading', { name: 'Postes ouverts pour vous · 1' })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})

describe('US-902 — postuler', () => {
  it('postuler avec un message, puis voir l’accusé de réception ; la carte dit « Candidature envoyée »', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    applyToOpening.mockResolvedValue({ ...APPLICATION, step: 'RECEIVED', step_label: 'Reçue et enregistrée', step_number: 1 })
    renderPage()
    const { user } = await open('Chargé de crédit')
    await user.click(screen.getByRole('button', { name: 'Postuler' }))
    await user.type(screen.getByLabelText('Votre message aux RH (facultatif)'), 'Je connais bien le crédit.')
    listMyApplications.mockResolvedValue({ items: [{ ...APPLICATION, step: 'RECEIVED', step_label: 'Reçue et enregistrée', step_number: 1 }] })
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))

    expect(applyToOpening).toHaveBeenCalledWith(7, 'Je connais bien le crédit.', null)
    expect(sendCv).not.toHaveBeenCalled()
    expect(await screen.findByText(/Candidature reçue le 04\/10\/2026/)).toBeInTheDocument()
    expect(await card('Chargé de crédit')).toHaveTextContent('Candidature envoyée')
    expect(screen.queryByRole('button', { name: 'Postuler' })).not.toBeInTheDocument()
  })

  it('joindre son CV : il est envoyé avant la candidature', async () => {
    const cv = new File(['%PDF-1.7'], 'cv-jean.pdf', { type: 'application/pdf' })
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    sendCv.mockResolvedValue({ uploadId: 'u1', name: 'cv-jean.pdf' })
    applyToOpening.mockResolvedValue(APPLICATION)
    renderPage()
    const { user } = await open('Chargé de crédit')
    await user.click(screen.getByRole('button', { name: 'Postuler' }))
    await user.upload(screen.getByLabelText('Votre CV (facultatif)'), cv)
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))
    expect(sendCv).toHaveBeenCalledWith(cv)
    expect(applyToOpening).toHaveBeenCalledWith(7, '', { uploadId: 'u1', name: 'cv-jean.pdf' })
  })

  it('un refus du portail s’affiche près du bouton', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    applyToOpening.mockRejectedValue(new ApiError(409, 'PROFILE_INCOMPLETE', 'Complétez votre profil avant de postuler.'))
    renderPage()
    const { user } = await open('Chargé de crédit')
    await user.click(screen.getByRole('button', { name: 'Postuler' }))
    await user.click(screen.getByRole('button', { name: 'Envoyer ma candidature' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Complétez votre profil avant de postuler.')
  })
})

describe('US-131 CA-05 — suivre ma candidature', () => {
  it('les 7 étapes : passées avec leur date, l’étape en cours, les suivantes', async () => {
    listMyOpenings.mockResolvedValue({ items: [OPENING] })
    listMyApplications.mockResolvedValue({ items: [APPLICATION] })
    renderPage()
    const list = await screen.findByRole('list', { name: 'Mes candidatures' })
    const [item] = within(list).getAllByRole('listitem', { name: /Chargé de crédit/ })
    expect(item).toHaveTextContent('CAND-00003 · envoyée le 4 oct.')
    expect(item).toHaveTextContent('CV joint : cv-jean.pdf')
    const steps = within(within(item).getByRole('list', { name: 'Étapes de la candidature' })).getAllByRole('listitem')
    // L'icône « check » des étapes passées fait partie du texte.
    expect(steps.map((s) => s.textContent.replace(/^check/, ''))).toEqual([
      'Reçue et enregistrée · 4 oct.',
      'Étude par la DRH · 7 oct.',
      '3Consultation du responsable du départementEn cours depuis le 10 oct.',
      '4Évaluation, si nécessaire',
      '5Décision de la DRH',
      '6Approbation de la Direction Générale',
      '7Clôture',
    ])
    expect(steps[2]).toHaveAttribute('aria-current', 'step')
    expect(await card('Chargé de crédit')).toHaveTextContent('Candidature envoyée')
  })

  it('une évaluation sautée ne porte pas de date', async () => {
    listMyApplications.mockResolvedValue({
      items: [
        {
          ...APPLICATION,
          step: 'DRH_DECISION',
          step_label: 'Décision de la DRH',
          step_number: 5,
          history: [...APPLICATION.history, step('DRH_DECISION', 'Décision de la DRH', '2026-10-15T09:00:00Z')],
        },
      ],
    })
    renderPage()
    const steps = within(await screen.findByRole('list', { name: 'Étapes de la candidature' })).getAllByRole('listitem')
    expect(steps[3]).toHaveTextContent(/Évaluation, si nécessaire · non nécessaire$/)
    expect(steps[4]).toHaveAttribute('aria-current', 'step')
  })

  it('retirer sa candidature, après confirmation ; une candidature clôturée montre son issue', async () => {
    const user = userEvent.setup()
    listMyApplications.mockResolvedValue({ items: [APPLICATION] })
    withdrawApplication.mockResolvedValue({})
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Retirer ma candidature' }))
    listMyApplications.mockResolvedValue({
      items: [{ ...APPLICATION, step: 'CLOSED', step_label: 'Clôturée', step_number: 7, outcome_label: 'Retirée', can_withdraw: false }],
    })
    await user.click(screen.getByRole('button', { name: 'Oui, retirer' }))
    expect(withdrawApplication).toHaveBeenCalledWith(3)
    expect(await screen.findByText(/Clôturée · Retirée/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Étapes de la candidature' })).not.toBeInTheDocument()
  })
})
