import { render, screen, waitFor, within } from '@testing-library/react'
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
  previewAudience,
  publishOpening,
  sendHrLetter,
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
  previewAudience: vi.fn(),
  publishOpening: vi.fn(),
  sendHrLetter: vi.fn(),
  openingLetterUrl: (id) => `/api/admin/openings/${id}/letter`,
  applicationCvUrl: (id) => `/api/admin/applications/${id}/cv`,
}))
vi.mock('../../../api/admin.js', () => ({ getAdminMe: vi.fn() }))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const FORM = {
  units: [
    { code: 'AD', label: 'Agence Démo', type_label: 'Agence' },
    { code: 'DM', label: 'Delmas', type_label: 'Agence' },
    { code: 'PV', label: 'Pétion-Ville', type_label: 'Agence' },
    { code: 'DCR', label: 'Direction du Crédit', type_label: 'Direction' },
  ],
  levels: [
    { code: 'LICENCE', label: 'Licence' },
    { code: 'MASTER', label: 'Master' },
  ],
  domains: [
    { code: 'COMPTABILITE', label: 'Comptabilité' },
    { code: 'FINANCE', label: 'Finance' },
    { code: 'GESTION', label: 'Gestion' },
  ],
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
    domains: ['FINANCE'],
    min_years_in_institution: 2,
    min_years_in_position: null,
    min_grade: null,
    unit_codes: [],
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
  previewAudience.mockResolvedValue({ base: 7, base_label: 'employés en activité', steps: [], visible: 7 })
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
    expect(await screen.findByRole('link', { name: 'Saisir un poste hors catalogue' })).toHaveAttribute(
      'href',
      '/admin/postes/nouveau',
    )
    unmount()

    getAdminMe.mockResolvedValue(me('READONLY'))
    renderAt('/admin/postes')
    await screen.findByRole('list', { name: 'Postes' })
    expect(screen.queryByRole('link', { name: /Saisir un poste/ })).not.toBeInTheDocument()
  })

  it('US-124 CA-05 — l’écran s’intitule « Publication de postes », sans sous-titre', async () => {
    renderAt('/admin/postes')
    expect(await screen.findByRole('heading', { level: 1, name: 'Publication de postes' })).toBeInTheDocument()
    expect(screen.queryByText(/Un Agent RH saisit le poste/)).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(createOpening).toHaveBeenCalledWith({
      code: 'cc-2026-01',
      title: 'Chargé de crédit',
      unit_code: 'AD',
      target_grade: '',
      mission: 'Instruire les demandes.',
      opens_on: '2026-10-15',
      closes_on: '2026-11-15',
      criteria: {
        min_level: 'LICENCE',
        domains: [],
        min_years_in_institution: 2,
        min_years_in_position: null,
        min_grade: null,
        unit_codes: [],
      },
    })
    expect(await screen.findByRole('heading', { name: 'Chargé de crédit' })).toBeInTheDocument()
  })

  it("US-117 : sans référentiel, l'unité du poste se saisit en texte libre et le poste est visible par tous les aptes", async () => {
    const user = userEvent.setup()
    getOpeningForm.mockResolvedValue({ ...FORM, units: [] })
    createOpening.mockResolvedValue(OPENING)
    renderAt('/admin/postes/nouveau')

    expect(await screen.findByText(/Le référentiel des unités n'est pas encore importé/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importer le référentiel' })).toHaveAttribute('href', '/admin/referentiel')
    expect(screen.queryByText('Visible seulement par les employés de…')).not.toBeInTheDocument()
    const unit = screen.getByRole('textbox', { name: /Unité du poste/ })
    await user.type(unit, 'Agence de Pétion-Ville')
    await user.type(screen.getByLabelText('Code du poste'), 'cc-2026-01')
    await user.type(screen.getByLabelText('Intitulé'), 'Chargé de crédit')
    await user.type(screen.getByLabelText('Mission'), 'Instruire les demandes.')
    await user.type(screen.getByLabelText("Date d'ouverture"), '2026-10-15')
    await user.type(screen.getByLabelText('Date limite'), '2026-11-15')
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(createOpening).toHaveBeenCalledWith(expect.objectContaining({ unit_code: 'Agence de Pétion-Ville' }))
    expect(createOpening.mock.calls[0][0].criteria.unit_codes).toEqual([])
  })

  it("une erreur s'affiche sous le champ concerné", async () => {
    const user = userEvent.setup()
    createOpening.mockRejectedValue(
      new ApiError(422, 'INVALID_OPENING_FIELD', "La date limite vient après la date d'ouverture.", 'closes_on'),
    )
    renderAt('/admin/postes/nouveau')
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

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

describe('US-115 — qui verra ce poste', () => {
  async function addUnit(user, query, option) {
    await user.type(screen.getByRole('combobox', { name: /Visible seulement par les employés de/ }), query)
    await user.click(within(screen.getByRole('listbox', { name: 'Unités proposées' })).getByRole('option', { name: option }))
  }

  it('CA-01, CA-02 : plusieurs unités et plusieurs domaines, enregistrés avec la fiche', async () => {
    const user = userEvent.setup()
    createOpening.mockResolvedValue(OPENING)
    renderAt('/admin/postes/nouveau')
    await screen.findByLabelText('Code du poste')

    await addUnit(user, 'pét', /Pétion-Ville/)
    await addUnit(user, 'Del', /Delmas/)
    const chosen = screen.getByRole('list', { name: 'Unités choisies' })
    expect(within(chosen).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Pétion-Ville'),
      expect.stringContaining('Delmas'),
    ])
    await user.click(screen.getByRole('checkbox', { name: 'Finance' }))
    await user.click(screen.getByRole('checkbox', { name: 'Comptabilité' }))
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(createOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        criteria: expect.objectContaining({ unit_codes: ['PV', 'DM'], domains: ['FINANCE', 'COMPTABILITE'] }),
      }),
    )
  })

  it('CA-01 : une unité choisie se retire, et ne se propose plus tant qu’elle est choisie', async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes/nouveau')
    await screen.findByLabelText('Code du poste')
    await addUnit(user, 'pét', /Pétion-Ville/)

    await user.type(screen.getByRole('combobox', { name: /Visible seulement par les employés de/ }), 'pét')
    expect(screen.queryByRole('listbox', { name: 'Unités proposées' })).not.toBeInTheDocument()
    expect(screen.getByText('Aucune autre unité ne correspond.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retirer Pétion-Ville' }))
    expect(screen.queryByRole('list', { name: 'Unités choisies' })).not.toBeInTheDocument()
  })

  it('CA-04 : l’aperçu dit combien d’employés verront le poste et ce qui écarte les autres', async () => {
    const user = userEvent.setup()
    previewAudience.mockResolvedValue({
      base: 48,
      base_label: 'employés rattachés à Pétion-Ville ou Delmas',
      steps: [
        { excluded: 30, reason: 'sans certificat validé en Comptabilité ou Finance' },
        { excluded: 6, reason: 'grade inférieur à 10' },
      ],
      visible: 12,
    })
    renderAt('/admin/postes/nouveau')
    await screen.findByLabelText('Code du poste')
    await addUnit(user, 'pét', /Pétion-Ville/)

    await waitFor(() =>
      expect(previewAudience).toHaveBeenLastCalledWith(expect.objectContaining({ unit_codes: ['PV'], domains: [] })),
    )
    const preview = screen.getByRole('region', { name: 'Aperçu de l’audience' })
    expect(await within(preview).findByText('12')).toBeInTheDocument()
    expect(preview).toHaveTextContent('employés verront ce poste')
    expect(preview).toHaveTextContent('48 employés rattachés à Pétion-Ville ou Delmas')
    expect(preview).toHaveTextContent('− 30 sans certificat validé en Comptabilité ou Finance')
    expect(preview).toHaveTextContent('− 6 grade inférieur à 10')
  })

  it('CA-05 : personne ne verrait le poste — un avertissement, et l’enregistrement reste possible', async () => {
    const user = userEvent.setup()
    previewAudience.mockResolvedValue({ base: 0, base_label: 'employés en activité', steps: [], visible: 0 })
    createOpening.mockResolvedValue(OPENING)
    renderAt('/admin/postes/nouveau')
    await screen.findByLabelText('Code du poste')

    expect(await screen.findByText('Personne ne verra ce poste')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Suivant' })
    expect(save).toBeEnabled()
  })

  it('modifier un poste : ses unités et ses domaines sont repris', async () => {
    getOpening.mockResolvedValue({ ...OPENING, criteria: { ...OPENING.criteria, unit_codes: ['AD', 'DM'], domains: ['FINANCE'] } })
    renderAt('/admin/postes/7/modifier')
    const chosen = await screen.findByRole('list', { name: 'Unités choisies' })
    expect(chosen).toHaveTextContent('Agence Démo')
    expect(chosen).toHaveTextContent('Delmas')
    expect(screen.getByRole('checkbox', { name: 'Finance' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Gestion' })).not.toBeChecked()
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

  it("l'Agent RH ne clôture pas et ne marque pas pourvu", async () => {
    getOpening.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7')
    await screen.findByRole('heading', { name: 'Chargé de crédit' })
    expect(screen.queryByRole('button', { name: /Clôturer|Marquer pourvu/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute('href', '/admin/postes/7/modifier')
  })

  it("l'Administrateur publie un brouillon, puis peut le clôturer ou le marquer pourvu", async () => {
    const user = userEvent.setup()
    getAdminMe.mockResolvedValue(me('ADMIN'))
    publishOpening.mockResolvedValue(PUBLISHED)
    renderAt('/admin/postes/7')
    await user.click(await screen.findByRole('button', { name: 'Publier' }))
    expect(publishOpening).toHaveBeenCalledWith('7', null)
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

describe('US-122 — saisir un poste sans grade', () => {
  it('le formulaire ne demande ni grade visé ni grade minimum', async () => {
    renderAt('/admin/postes/nouveau')
    await screen.findByLabelText('Code du poste')
    expect(screen.queryByLabelText('Grade visé')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Grade minimum')).not.toBeInTheDocument()
  })

  it('la liste des postes n’affiche plus le grade visé', async () => {
    listOpenings.mockResolvedValue({ items: [OPENING] })
    renderAt('/admin/postes')
    expect(await screen.findByText('Chargé de crédit')).toBeInTheDocument()
    expect(screen.queryByText(/grade 10/)).not.toBeInTheDocument()
  })
})

const LETTER = { name: 'lettre-drh.pdf', content_type: 'application/pdf', size_bytes: 2048, at: '2026-10-05T09:00:00Z', actor_name: 'Agent RH Démo' }
const pdf = () => new File(['%PDF-1.7'], 'lettre-drh.pdf', { type: 'application/pdf' })

describe('US-124 — publier avec la lettre du directeur RH', () => {
  it("CA-01 — l'Agent RH ne publie pas sans la lettre : le message est près du champ", async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes/7')
    const field = await screen.findByLabelText('Lettre du directeur RH')
    await user.click(screen.getByRole('button', { name: 'Publier' }))
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/Joignez la lettre du directeur RH pour publier ce poste\./)
    expect(sendHrLetter).not.toHaveBeenCalled()
    expect(publishOpening).not.toHaveBeenCalled()
  })

  it("CA-01 — l'Agent RH joint la lettre et publie", async () => {
    const user = userEvent.setup()
    sendHrLetter.mockResolvedValue({ uploadId: 'a'.repeat(32), name: 'lettre-drh.pdf' })
    publishOpening.mockResolvedValue({ ...PUBLISHED, letter: LETTER })
    renderAt('/admin/postes/7')
    const file = pdf()
    await user.upload(await screen.findByLabelText('Lettre du directeur RH'), file)
    await user.click(screen.getByRole('button', { name: 'Publier' }))
    expect(sendHrLetter).toHaveBeenCalledWith(file)
    expect(publishOpening).toHaveBeenCalledWith('7', { uploadId: 'a'.repeat(32), name: 'lettre-drh.pdf' })
    expect(await screen.findByRole('status')).toHaveTextContent('Poste publié.')
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument()
  })

  it("CA-02 — pour l'Administrateur, la lettre est facultative", async () => {
    getAdminMe.mockResolvedValue(me('ADMIN'))
    renderAt('/admin/postes/7')
    expect(await screen.findByLabelText('Lettre du directeur RH (facultative)')).toBeInTheDocument()
  })

  it('un compte en lecture seule ne publie pas', async () => {
    getAdminMe.mockResolvedValue(me('READONLY'))
    renderAt('/admin/postes/7')
    await screen.findByRole('heading', { name: 'Chargé de crédit' })
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument()
  })

  it('CA-03 — la fiche montre la lettre, qui l’a jointe et quand, avec un lien pour l’ouvrir', async () => {
    getAdminMe.mockResolvedValue(me('ADMIN'))
    getOpening.mockResolvedValue({ ...PUBLISHED, letter: LETTER })
    renderAt('/admin/postes/7')
    const section = await screen.findByRole('region', { name: 'Lettre du directeur RH' })
    expect(section).toHaveTextContent('Jointe le 05/10/2026 par Agent RH Démo')
    expect(within(section).getByRole('link', { name: /Voir la lettre/ })).toHaveAttribute('href', '/api/admin/openings/7/letter')
  })
})
