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
  { code: 'agent-fictif-credit', title: 'Agent fictif de crédit', domain: 'Banque et microfinance', level_text: 'Bac + 4' },
  { code: 'comptable-fictif', title: 'Comptable fictif', domain: 'Comptabilité', level_text: 'Bac + 5' },
  { code: 'gardien-fictif', title: 'Gardien fictif', domain: 'Sécurité', level_text: null },
]

const COMPTABLE = {
  ...PROFILES[1],
  description: "Le comptable fictif tient les livres de l'institution fictive.",
  sections: [
    { title: 'Missions', lines: ['Concilier les comptes fictifs', 'Vérifier les écritures'] },
    { title: 'Qualités attendues', lines: ['Être rigoureux'] },
  ],
  suggested_domains: ['COMPTABILITE', 'FINANCE'],
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
    expect(within(items[0]).getByText('Banque et microfinance')).toBeInTheDocument()
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

  it('filtre par domaine et dit quand rien ne correspond', async () => {
    const user = userEvent.setup()
    renderAt('/admin/postes?onglet=catalogue')
    await user.selectOptions(await screen.findByLabelText('Domaine'), 'Comptabilité')
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
    expect(getJobProfile).toHaveBeenCalledWith('comptable-fictif')
    expect(within(preview).getByText("Le comptable fictif tient les livres de l'institution fictive.")).toBeInTheDocument()
    expect(within(preview).getByText('Missions')).toBeInTheDocument()
    expect(within(preview).getByText('Concilier les comptes fictifs')).toBeInTheDocument()
    expect(within(preview).getByRole('link', { name: /Publier ce poste/ })).toHaveAttribute(
      'href',
      '/admin/postes/nouveau?fiche=comptable-fictif',
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
    renderAt('/admin/postes/nouveau?fiche=comptable-fictif')

    expect(await screen.findByText(/Repris de la fiche « Comptable fictif »/)).toBeInTheDocument()
    expect(screen.getByLabelText('Intitulé')).toHaveValue('Comptable fictif')
    expect(screen.getByLabelText('Mission')).toHaveValue("Le comptable fictif tient les livres de l'institution fictive.")
    expect(screen.getByRole('checkbox', { name: 'Comptabilité' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Finance' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Gestion' })).not.toBeChecked()
    expect(screen.getByLabelText("Niveau d'études minimum")).toHaveValue('MASTER')

    await user.type(screen.getByLabelText('Code du poste'), 'CPT-2026-01')
    await user.type(screen.getByLabelText('Unité du poste'), 'Direction Démo Comptable')
    await user.type(screen.getByLabelText('Grade visé'), '8')
    await user.type(screen.getByLabelText("Date d'ouverture"), '2026-10-15')
    await user.type(screen.getByLabelText('Date limite'), '2026-11-15')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }))

    expect(createOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Comptable fictif',
        profile_code: 'comptable-fictif',
        criteria: expect.objectContaining({ domains: ['COMPTABILITE', 'FINANCE'], min_level: 'MASTER' }),
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
