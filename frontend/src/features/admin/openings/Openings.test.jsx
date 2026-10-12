import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminMe } from '../../../api/admin.js'
import { ApiError } from '../../../api/client.js'
import {
  changeOpeningStatus,
  closeApplication,
  createOpening,
  getOpening,
  getOpeningForm,
  listOpeningApplications,
  listOpenings,
  moveApplication,
  updateOpening,
} from '../../../api/openings.js'
import OpeningDetailPage from './OpeningDetailPage.jsx'
import OpeningFormPage from './OpeningFormPage.jsx'
import OpeningsPage from './OpeningsPage.jsx'

vi.mock('../../../api/openings.js', () => ({
  listOpenings: vi.fn(),
  getOpeningForm: vi.fn(),
  getOpening: vi.fn(),
  createOpening: vi.fn(),
  updateOpening: vi.fn(),
  changeOpeningStatus: vi.fn(),
  listOpeningApplications: vi.fn(),
  moveApplication: vi.fn(),
  closeApplication: vi.fn(),
  applicationCvUrl: (id) => `/api/admin/applications/${id}/cv`,
}))
vi.mock('../../../api/admin.js', () => ({ getAdminMe: vi.fn() }))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const FORM = {
  units: [
    { code: 'AD', label: 'Agence Démo', type_label: 'Agence' },
    { code: 'DCR', label: 'Direction du Crédit', type_label: 'Direction' },
  ],
  levels: [
    { code: 'LICENCE', label: 'Licence' },
    { code: 'MASTER', label: 'Master' },
  ],
  domains: [{ code: 'FINANCE', label: 'Finance' }],
}

const step = (status, statusLabel, at, actor) => ({ status, status_label: statusLabel, at, actor_name: actor })

const OPENING = {
  id: 7,
  code: 'CC-2026-01',
  title: 'Chargé de crédit',
  unit_code: 'AD',
  unit_label: 'Agence Démo',
  target_grade: '10',
  mission: "Instruire les demandes de crédit de l'agence.",
  opens_on: '2026-10-15',
  closes_on: '2026-11-15',
  criteria: {
    min_level: 'LICENCE',
    domain: 'FINANCE',
    min_years_in_institution: 2,
    min_years_in_position: null,
    min_grade: null,
    unit_code: null,
  },
  criteria_lines: ["Niveau d'études minimum : Licence", 'Domaine : Finance', "Ancienneté dans l'institution : 2 ans au moins"],
  status: 'DRAFT',
  status_label: 'Brouillon',
  history: [step('DRAFT', 'Brouillon', '2026-10-04T09:00:00Z', 'Agent RH Démo')],
  criteria_changes: [],
}

const PUBLISHED = {
  ...OPENING,
  status: 'PUBLISHED',
  status_label: 'Publié',
  history: [...OPENING.history, step('PUBLISHED', 'Publié', '2026-10-05T09:00:00Z', 'Administrateur Démo')],
}

const me = (role) => ({ id: 'x', username: 'demo', role, role_label: role, must_change_password: false })

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/postes" element={<OpeningsPage />} />
        <Route path="/admin/postes/nouveau" element={<OpeningFormPage />} />
        <Route path="/admin/postes/:id" element={<OpeningDetailPage />} />
        <Route path="/admin/postes/:id/modifier" element={<OpeningFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getAdminMe.mockResolvedValue(me('AGENT_RH'))
  getOpeningForm.mockResolvedValue(FORM)
  getOpening.mockResolvedValue(OPENING)
  listOpeningApplications.mockResolvedValue({ items: [] })
  listOpenings.mockResolvedValue({ items: [PUBLISHED, { ...OPENING, id: 8, code: 'AG-2026-02', title: 'Agent de guichet' }] })
})

describe('US-802 — liste des postes', () => {
  it('montre chaque poste avec son statut en texte, son unité et ses dates', async () => {
    renderAt('/admin/postes')
    const list = await screen.findByRole('list', { name: 'Postes' })
    const [first, second] = within(list).getAllByRole('listitem')
    expect(within(first).getByRole('link', { name: /Chargé de crédit/ })).toHaveAttribute('href', '/admin/postes/7')
    expect(within(first).getByText('Publié')).toBeInTheDocument()
    expect(within(first).getByText(/Agence Démo/)).toBeInTheDocument()
    expect(within(first).getByText(/15\/10\/2026 au 15\/11\/2026/)).toBeInTheDocument()
    expect(within(second).getByText('Brouillon')).toBeInTheDocument()
  })

  it("un Agent RH peut saisir un poste ; un compte en lecture seule non", async () => {
    const { unmount } = renderAt('/admin/postes')
    expect(await screen.findByRole('link', { name: /Saisir un poste/ })).toHaveAttribute('href', '/admin/postes/nouveau')
    unmount()

    getAdminMe.mockResolvedValue(me('READONLY'))
    renderAt('/admin/postes')
    await screen.findByRole('list', { name: 'Postes' })
    expect(screen.queryByRole('link', { name: /Saisir un poste/ })).not.toBeInTheDocument()
  })

  it('aucun poste : le dit simplement', async () => {
    listOpenings.mockResolvedValue({ items: [] })
    renderAt('/admin/postes')
    expect(await screen.findByText('Aucun poste saisi pour le moment.')).toBeInTheDocument()
  })
})

describe('US-802 CA-01 — saisir la fiche', () => {
  async function fill(user) {
    await user.type(await screen.findByLabelText('Code du poste'), 'cc-2026-01')
    await user.type(screen.getByLabelText('Intitulé'), 'Chargé de crédit')
    await user.selectOptions(screen.getByLabelText('Unité du poste'), 'AD')
    await user.type(screen.getByLabelText('Grade visé'), '10')
    await user.type(screen.getByLabelText('Mission'), 'Instruire les demandes.')
    await user.type(screen.getByLabelText("Date d'ouverture"), '2026-10-15')
    await user.type(screen.getByLabelText('Date limite'), '2026-11-15')
    await user.selectOptions(screen.getByLabelText("Niveau d'études minimum"), 'LICENCE')
    await user.type(screen.getByLabelText("Ancienneté dans l'institution (années)"), '2')
  }

  it('enregistre un brouillon avec des critères structurés, puis ouvre la fiche', async () => {
    const user = userEvent.setup()
    createOpening.mockResolvedValue(OPENING)
    renderAt('/admin/postes/nouveau')
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }))

    expect(createOpening).toHaveBeenCalledWith({
      code: 'cc-2026-01',
      title: 'Chargé de crédit',
      unit_code: 'AD',
      target_grade: '10',
      mission: 'Instruire les demandes.',
      opens_on: '2026-10-15',
      closes_on: '2026-11-15',
      criteria: {
        min_level: 'LICENCE',
        domain: null,
        min_years_in_institution: 2,
        min_years_in_position: null,
        min_grade: null,
        unit_code: null,
      },
    })
    expect(await screen.findByRole('heading', { name: 'Chargé de crédit' })).toBeInTheDocument()
  })

  it("sans référentiel importé, le formulaire dit pourquoi aucune unité n'est proposée", async () => {
    getOpeningForm.mockResolvedValue({ ...FORM, units: [] })
    renderAt('/admin/postes/nouveau')

    expect(await screen.findByText(/Aucune unité à proposer/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importer le référentiel' })).toHaveAttribute('href', '/admin/referentiel')
  })

  it("une erreur s'affiche sous le champ concerné", async () => {
    const user = userEvent.setup()
    createOpening.mockRejectedValue(
      new ApiError(422, 'INVALID_OPENING_FIELD', "La date limite vient après la date d'ouverture.", 'closes_on'),
    )
    renderAt('/admin/postes/nouveau')
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }))

    const field = screen.getByLabelText('Date limite')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription("La date limite vient après la date d'ouverture.")
  })

  it("modifier un poste publié prévient que les critères changés sont tracés", async () => {
    const user = userEvent.setup()
    getOpening.mockResolvedValue(PUBLISHED)
    updateOpening.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7/modifier')
    expect(await screen.findByLabelText('Code du poste')).toHaveValue('CC-2026-01')
    expect(screen.getByLabelText("Niveau d'études minimum")).toHaveValue('LICENCE')
    expect(screen.getByText(/Toute modification des critères est tracée/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(updateOpening).toHaveBeenCalledWith('7', expect.objectContaining({ code: 'CC-2026-01' }))
  })
})

describe('US-802 CA-02 — statuts, date et auteur', () => {
  it("montre la fiche, les critères et l'historique daté et signé", async () => {
    getOpening.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7')
    expect(await screen.findByRole('heading', { name: 'Chargé de crédit' })).toBeInTheDocument()
    expect(screen.getByText("Niveau d'études minimum : Licence")).toBeInTheDocument()
    const history = screen.getByRole('list', { name: 'Historique du statut' })
    const [draft, published] = within(history).getAllByRole('listitem')
    expect(draft).toHaveTextContent('Brouillon — 04/10/2026 · Agent RH Démo')
    expect(published).toHaveTextContent('Publié — 05/10/2026 · Administrateur Démo')
  })

  it("l'Agent RH ne change pas le statut", async () => {
    renderAt('/admin/postes/7')
    await screen.findByRole('heading', { name: 'Chargé de crédit' })
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute('href', '/admin/postes/7/modifier')
    expect(screen.getByText(/En attente de la validation d'un Administrateur/)).toBeInTheDocument()
  })

  it("l'Administrateur publie un brouillon, puis peut le clôturer ou le marquer pourvu", async () => {
    const user = userEvent.setup()
    getAdminMe.mockResolvedValue(me('ADMIN'))
    changeOpeningStatus.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7')
    await user.click(await screen.findByRole('button', { name: 'Publier' }))
    expect(changeOpeningStatus).toHaveBeenCalledWith('7', 'publish')
    expect(await screen.findByRole('button', { name: 'Clôturer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marquer pourvu' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Poste publié.')
  })

  it("un poste pourvu ne se modifie plus", async () => {
    getAdminMe.mockResolvedValue(me('ADMIN'))
    getOpening.mockResolvedValue({ ...PUBLISHED, status: 'FILLED', status_label: 'Pourvu' })
    renderAt('/admin/postes/7')
    await screen.findByRole('heading', { name: 'Chargé de crédit' })
    expect(screen.queryByRole('link', { name: 'Modifier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Publier|Clôturer|Marquer pourvu/ })).not.toBeInTheDocument()
  })

  it('montre chaque critère modifié après publication : avant, après, qui et quand', async () => {
    getOpening.mockResolvedValue({
      ...PUBLISHED,
      criteria_changes: [
        {
          at: '2026-10-06T09:00:00Z',
          actor_name: 'Agent RH Démo',
          before: ["Niveau d'études minimum : Licence"],
          after: ["Niveau d'études minimum : Master"],
        },
      ],
    })
    renderAt('/admin/postes/7')
    const trace = await screen.findByRole('region', { name: 'Critères modifiés après publication' })
    expect(trace).toHaveTextContent('06/10/2026 · Agent RH Démo')
    expect(within(trace).getByText("Niveau d'études minimum : Licence")).toBeInTheDocument()
    expect(within(trace).getByText("Niveau d'études minimum : Master")).toBeInTheDocument()
  })
})

const APPLICATION = {
  id: 3,
  reference: 'CAND-00003',
  opening_id: 7,
  opening_code: 'CC-2026-01',
  opening_title: 'Chargé de crédit',
  motivation: 'Je connais bien le crédit.',
  received_at: '2026-10-04T09:00:00Z',
  step: 'RECEIVED',
  step_label: 'Reçue et enregistrée',
  step_number: 1,
  outcome: null,
  outcome_label: null,
  can_withdraw: true,
  history: [{ step: 'RECEIVED', step_label: 'Reçue et enregistrée', outcome_label: null, at: '2026-10-04T09:00:00Z', actor_name: 'Jean JOSEPH' }],
  employee_code: 'AC-1001',
  employee_name: 'Jean JOSEPH',
  cv: { name: 'cv-jean.pdf', content_type: 'application/pdf', size_bytes: 2048 },
  profile_snapshot: ['Poste : Agent de crédit', 'Grade : 12', "Niveau d'études validé : Licence"],
  next_steps: [
    { code: 'DRH_REVIEW', label: 'Étude par la DRH' },
    { code: 'MANAGER', label: 'Consultation du responsable du département' },
  ],
}

describe('US-902 — candidatures sur la fiche du poste', () => {
  it("liste chaque candidature : employé, date, message, étape et historique signé", async () => {
    getOpening.mockResolvedValue(PUBLISHED)
    listOpeningApplications.mockResolvedValue({ items: [APPLICATION] })
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Candidatures (1)' })
    const [item] = within(section).getAllByRole('listitem', { name: /Jean JOSEPH/ })
    expect(item).toHaveTextContent('AC-1001')
    expect(item).toHaveTextContent('N° CAND-00003 · reçue le 04/10/2026')
    expect(item).toHaveTextContent('Je connais bien le crédit.')
    expect(item).toHaveTextContent('Reçue et enregistrée — 04/10/2026 · Jean JOSEPH')
    expect(within(item).getByRole('link', { name: /Voir le CV/ })).toHaveAttribute('href', '/api/admin/applications/3/cv')
    const snapshot = within(item).getByRole('list', { name: 'Profil au moment de la candidature' })
    expect(snapshot).toHaveTextContent("Niveau d'études validé : Licence")
  })

  it("un Agent RH fait passer la candidature à l'étape suivante", async () => {
    const user = userEvent.setup()
    getOpening.mockResolvedValue(PUBLISHED)
    listOpeningApplications.mockResolvedValue({ items: [APPLICATION] })
    moveApplication.mockResolvedValue({ ...APPLICATION, step: 'MANAGER', step_number: 3, step_label: 'Consultation du responsable du département' })
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Candidatures (1)' })
    await user.selectOptions(within(section).getByLabelText('Étape suivante'), 'MANAGER')
    await user.click(within(section).getByRole('button', { name: "Passer à l'étape" }))
    expect(moveApplication).toHaveBeenCalledWith(3, 'MANAGER')
    expect(await within(section).findByText('Étape 3 sur 7 : Consultation du responsable du département')).toBeInTheDocument()
  })

  it('clôturer avec une suite', async () => {
    const user = userEvent.setup()
    getOpening.mockResolvedValue(PUBLISHED)
    listOpeningApplications.mockResolvedValue({ items: [APPLICATION] })
    closeApplication.mockResolvedValue({
      ...APPLICATION, step: 'CLOSED', step_label: 'Clôturée', outcome: 'ACCEPTED', outcome_label: 'Acceptée', can_withdraw: false, next_steps: [],
    })
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Candidatures (1)' })
    await user.selectOptions(within(section).getByLabelText('Suite donnée'), 'ACCEPTED')
    await user.click(within(section).getByRole('button', { name: 'Clôturer la candidature' }))
    expect(closeApplication).toHaveBeenCalledWith(3, 'ACCEPTED')
    expect(await within(section).findByText('Clôturée · Acceptée')).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: "Passer à l'étape" })).not.toBeInTheDocument()
  })

  it('un compte en lecture seule voit les candidatures sans pouvoir les faire avancer', async () => {
    getAdminMe.mockResolvedValue(me('READONLY'))
    getOpening.mockResolvedValue(PUBLISHED)
    listOpeningApplications.mockResolvedValue({ items: [APPLICATION] })
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Candidatures (1)' })
    expect(within(section).queryByRole('button', { name: "Passer à l'étape" })).not.toBeInTheDocument()
  })

  it('aucune candidature : le dit simplement', async () => {
    getOpening.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Candidatures (0)' })
    expect(section).toHaveTextContent('Aucune candidature pour le moment.')
  })
})
