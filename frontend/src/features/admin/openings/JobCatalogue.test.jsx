import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminMe } from '../../../api/admin.js'
import {
  createOpening,
  getJobProfile,
  getOpeningForm,
  listJobProfiles,
  listOpenings,
  previewAudience,
} from '../../../api/openings.js'
import { setDesktop } from '../../../lib/testViewport.js'
import OpeningFormPage from './OpeningFormPage.jsx'
import OpeningsPage from './OpeningsPage.jsx'

vi.mock('../../../api/openings.js', () => ({
  listOpenings: vi.fn(),
  listJobProfiles: vi.fn(),
  getJobProfile: vi.fn(),
  getOpeningForm: vi.fn(),
  getOpening: vi.fn(),
  createOpening: vi.fn(),
  updateOpening: vi.fn(),
  previewAudience: vi.fn(),
}))
vi.mock('../../../api/admin.js', () => ({ getAdminMe: vi.fn() }))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const PROFILES = [
  {
    code: 'AF01',
    position_code: 'AF01',
    title: 'Agent fictif de crédit',
    department: 'Crédit',
    service: 'Réseau d’agences fictif',
    level_text: 'Bac + 4',
  },
  { code: 'CF02', position_code: 'CF02', title: 'Comptable fictif', department: 'Finance', service: 'Comptabilité', level_text: 'Bac + 5' },
  {
    code: 'charge-de-mission-fictif',
    position_code: '',
    title: 'Chargé de mission fictif',
    department: 'Direction générale',
    service: 'Direction générale',
    level_text: null,
  },
]

const COMPTABLE = {
  ...PROFILES[1],
  description: "Le comptable fictif tient les livres de l'institution fictive.",
  competences: ['Respect des normes comptables', 'Clôture mensuelle fictive'],
  sections: [
    { title: 'Missions', lines: ['Concilier les comptes fictifs', 'Vérifier les écritures'] },
    { title: 'Qualités attendues', lines: ['Être rigoureux'] },
  ],
  suggested_domains: ['FINANCE', 'COMPTABILITE', 'ECONOMIE'],
  suggested_level: 'MASTER',
}

const FORM = {
  units: [],
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

const me = (role) => ({ id: 'x', username: 'demo', role, role_label: role, must_change_password: false })

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/postes" element={<OpeningsPage />} />
        <Route path="/admin/postes/nouveau" element={<OpeningFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getAdminMe.mockResolvedValue(me('AGENT_RH'))
  listOpenings.mockResolvedValue({ items: [] })
  listJobProfiles.mockResolvedValue({ items: PROFILES })
  getJobProfile.mockResolvedValue(COMPTABLE)
  getOpeningForm.mockResolvedValue(FORM)
  previewAudience.mockResolvedValue({ base: 7, base_label: 'employés en activité', steps: [], visible: 7 })
})

describe('US-119 CA-01 — deux onglets et le catalogue', () => {
  it('« Postes publiés » reste l’onglet par défaut ; « Catalogue des postes ACME » liste toutes les fiches', async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes')
    expect(await screen.findByRole('tab', { name: /Postes publiés/, selected: true })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Catalogue des postes ACME/ }))

    const list = await screen.findByRole('list', { name: 'Fiches de poste' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Agent fictif de crédit')).toBeInTheDocument()
    expect(within(items[0]).getByText('Crédit')).toBeInTheDocument()
    expect(within(items[0]).getByText('Bac + 4')).toBeInTheDocument()
    expect(within(items[2]).getByText('Non précisé')).toBeInTheDocument()
  })

  it('l’onglet du catalogue s’ouvre directement par son adresse', async () => {
    renderAt('/admin/postes?onglet=catalogue')
    expect(await screen.findByRole('tab', { name: /Catalogue des postes ACME/, selected: true })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Fiches de poste' })).toBeInTheDocument()
  })
})

describe('US-119 CA-02 — rechercher, filtrer et lire une fiche', () => {
  it('filtre par mots de l’intitulé, sans tenir compte des accents', async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes?onglet=catalogue')
    await user.type(await screen.findByLabelText('Rechercher un poste'), 'credit')
    const list = screen.getByRole('list', { name: 'Fiches de poste' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Agent fictif de crédit')).toBeInTheDocument()
  })

  it('filtre par département et dit quand rien ne correspond', async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes?onglet=catalogue')
    await user.selectOptions(await screen.findByLabelText('Département'), 'Finance')
    expect(within(screen.getByRole('list', { name: 'Fiches de poste' })).getAllByRole('listitem')).toHaveLength(1)
    await user.type(screen.getByLabelText('Rechercher un poste'), 'gardien')
    expect(screen.getByText('Aucune fiche ne correspond à votre recherche.')).toBeInTheDocument()
  })

  it('« Voir » ouvre la fiche en aperçu, avec ses rubriques', async () => {
    const user = userEvent.setup()
    setDesktop(true)
    renderAt('/admin/postes?onglet=catalogue')
    const list = await screen.findByRole('list', { name: 'Fiches de poste' })
    await user.click(within(list).getAllByRole('button', { name: /Voir/ })[1])

    const preview = await screen.findByRole('region', { name: 'Comptable fictif' })
    expect(getJobProfile).toHaveBeenCalledWith('CF02')
    expect(within(preview).getByText("Le comptable fictif tient les livres de l'institution fictive.")).toBeInTheDocument()
    expect(within(preview).getByText('Missions')).toBeInTheDocument()
    expect(within(preview).getByText('Concilier les comptes fictifs')).toBeInTheDocument()
    expect(within(preview).getByRole('link', { name: /Publier ce poste/ })).toHaveAttribute(
      'href',
      '/admin/postes/nouveau?fiche=CF02',
    )
    setDesktop(false)
  })

  it('un compte en lecture seule lit les fiches sans pouvoir publier', async () => {
    const user = userEvent.setup()
    getAdminMe.mockResolvedValue(me('READONLY'))
    renderAt('/admin/postes?onglet=catalogue')
    const list = await screen.findByRole('list', { name: 'Fiches de poste' })
    await user.click(within(list).getAllByRole('button', { name: /Voir/ })[1])
    await screen.findByRole('region', { name: 'Comptable fictif' })
    expect(screen.queryByRole('link', { name: /Publier ce poste/ })).not.toBeInTheDocument()
  })
})

describe('US-119 CA-03 — publier à partir d’une fiche', () => {
  it('pré-remplit l’intitulé, la mission, les domaines et le niveau, et garde le lien vers la fiche', async () => {
    const user = userEvent.setup()
    createOpening.mockResolvedValue({ id: 9 })
    renderAt('/admin/postes/nouveau?fiche=CF02')

    expect(await screen.findByText(/Repris de la fiche « Comptable fictif »/)).toBeInTheDocument()
    expect(screen.getByLabelText('Intitulé')).toHaveValue('Comptable fictif')
    expect(screen.getByLabelText('Mission')).toHaveValue("Le comptable fictif tient les livres de l'institution fictive.")
    expect(screen.getByRole('checkbox', { name: 'Comptabilité' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Finance' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Gestion' })).not.toBeChecked()
    expect(screen.getByLabelText("Niveau d'études minimum")).toHaveValue('MASTER')

    // US-121 : le code du poste vient de la matrice du directeur.
    expect(screen.getByLabelText('Code du poste')).toHaveValue('CF02')
    await user.type(screen.getByLabelText('Unité du poste'), 'Direction Démo Comptable')
    await user.type(screen.getByLabelText("Date d'ouverture"), '2026-10-15')
    await user.type(screen.getByLabelText('Date limite'), '2026-11-15')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }))

    expect(createOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CF02',
        title: 'Comptable fictif',
        profile_code: 'CF02',
        criteria: expect.objectContaining({ domains: ['FINANCE', 'COMPTABILITE'], min_level: 'MASTER' }),
      }),
    )
  })

  it('« Saisir un poste » hors catalogue n’envoie aucune fiche', async () => {
    renderAt('/admin/postes/nouveau')
    expect(await screen.findByLabelText('Intitulé')).toHaveValue('')
    expect(getJobProfile).not.toHaveBeenCalled()
    expect(screen.queryByText(/Repris de la fiche/)).not.toBeInTheDocument()
  })
})

describe('US-121 — le catalogue vient de la matrice des postes du directeur', () => {
  it('chaque poste montre son code, son département et son service', async () => {
    renderAt('/admin/postes?onglet=catalogue')
    const list = await screen.findByRole('list', { name: 'Fiches de poste' })
    const [agent, , charge] = within(list).getAllByRole('listitem')
    expect(agent).toHaveTextContent('AF01')
    expect(agent).toHaveTextContent('Réseau d’agences fictif')
    expect(charge).toHaveTextContent('Sans code')
  })

  it('l’aperçu montre le code, le département, le service et les compétences', async () => {
    const user = userEvent.setup()
    setDesktop(true)
    renderAt('/admin/postes?onglet=catalogue')
    const list = await screen.findByRole('list', { name: 'Fiches de poste' })
    await user.click(within(list).getAllByRole('button', { name: /Voir/ })[1])
    const preview = await screen.findByRole('region', { name: 'Comptable fictif' })
    expect(preview).toHaveTextContent('Code CF02')
    expect(preview).toHaveTextContent('Finance · Comptabilité')
    const competences = within(preview).getByRole('list', { name: 'Compétences' })
    expect(within(competences).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Respect des normes comptables',
      'Clôture mensuelle fictive',
    ])
    setDesktop(false)
  })

  it('un poste sans code laisse le code du poste à saisir', async () => {
    getJobProfile.mockResolvedValue({
      ...PROFILES[2],
      description: '',
      competences: ['Suivi des projets fictifs'],
      sections: [],
      suggested_domains: [],
      suggested_level: null,
    })
    renderAt('/admin/postes/nouveau?fiche=charge-de-mission-fictif')
    expect(await screen.findByText(/Repris de la fiche « Chargé de mission fictif »/)).toBeInTheDocument()
    expect(screen.getByLabelText('Code du poste')).toHaveValue('')
    expect(screen.getByLabelText('Intitulé')).toHaveValue('Chargé de mission fictif')
    // Sans description détaillée, la mission reprend les compétences.
    expect(screen.getByLabelText('Mission')).toHaveValue('Compétences attendues :\n- Suivi des projets fictifs')
  })
})
