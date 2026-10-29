import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminMe } from '../../../api/admin.js'
import { claimNextCertificate, getValidationQueue } from '../../../api/validation.js'
import ValidationQueuePage from './ValidationQueuePage.jsx'

vi.mock('../../../api/validation.js', () => ({ getValidationQueue: vi.fn(), claimNextCertificate: vi.fn() }))
vi.mock('../../../api/admin.js', () => ({ getAdminMe: vi.fn() }))
vi.mock('../useUnits.js', () => ({
  useUnits: () => ({
    agencies: [
      { code: 'SUD', label: 'Agence Démo Sud' },
      { code: 'NORD', label: 'Agence Démo Nord' },
    ],
  }),
}))

const item = (id, overrides) => ({
  certificate_id: id,
  employee_id: `emp-${id}`,
  employee_name: 'Paul Démo',
  employee_code: 'EMP-0204',
  agency_code: 'SUD',
  agency_name: 'Agence Démo Sud',
  title: 'Licence en Finance',
  certificate_type: 'DIPLOME',
  certificate_type_label: 'Diplôme',
  declared_level: 'LICENCE',
  declared_level_label: 'Licence',
  submitted_at: '2026-10-08T10:00:00Z',
  business_days: 7,
  is_overdue: true,
  status: 'RECEIVED',
  assigned_to: null,
  assigned_to_me: false,
  ...overrides,
})

const QUEUE = {
  items: [
    item('c1', {}),
    item('c2', {
      employee_name: 'Lucie Exemple',
      employee_code: 'EMP-0418',
      agency_code: 'NORD',
      agency_name: 'Agence Démo Nord',
      title: 'Excel avancé',
      certificate_type: 'CERTIFICAT',
      certificate_type_label: 'Certificat',
      submitted_at: '2026-10-15T09:00:00Z',
      business_days: 3,
      is_overdue: false,
      status: 'IN_REVIEW',
      assigned_to: 'admin',
      assigned_to_me: true,
    }),
    item('c3', {
      employee_name: 'Rose Étienne',
      submitted_at: '2026-10-16T09:00:00Z',
      business_days: 2,
      is_overdue: false,
      assigned_to: 'autre.agent',
    }),
  ],
  total_waiting: 3,
  total_overdue: 1,
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/validation']}>
      <Routes>
        <Route path="/admin/validation" element={<ValidationQueuePage />} />
        <Route path="/admin/validation/:id" element={<p>Examen du certificat</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const table = () => screen.findByRole('table', { name: 'Certificats en attente' })
const rows = (container) => within(container).getAllByRole('row').slice(1)

beforeEach(() => {
  vi.clearAllMocks()
  getValidationQueue.mockResolvedValue(QUEUE)
  getAdminMe.mockResolvedValue({ username: 'admin', role: 'AGENT_RH' })
})

describe('US-133 CA-01, CA-02 — en-tête et compteurs', () => {
  it('ce qui attend, le délai, « Prendre le suivant » et les trois compteurs', async () => {
    renderPage()
    await table()
    expect(screen.getByRole('heading', { name: 'File de validation des certificats', level: 1 })).toBeVisible()
    expect(screen.getByText('3 certificats attendent une décision. Délai : 5 jours ouvrables après le dépôt.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Prendre le suivant' })).toBeVisible()
    const counters = screen.getByRole('list', { name: 'Compteurs' })
    expect(within(counters).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1en retard',
      '2dans le délai',
      '1pris par vous',
    ])
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('« Prendre le suivant » ouvre l’examen du plus ancien', async () => {
    const user = userEvent.setup()
    claimNextCertificate.mockResolvedValue({ claimed: true, certificate_id: 'c1' })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Prendre le suivant' }))
    expect(await screen.findByText('Examen du certificat')).toBeVisible()
  })

  it('en lecture seule, pas de « Prendre le suivant »', async () => {
    getAdminMe.mockResolvedValue({ username: 'lecteur', role: 'READONLY' })
    renderPage()
    await table()
    expect(screen.queryByRole('button', { name: 'Prendre le suivant' })).not.toBeInTheDocument()
  })
})

describe('US-133 CA-03 — filtres', () => {
  it('Agence, Type de document, Délai ; plus de « Niveau déclaré »', async () => {
    const user = userEvent.setup()
    renderPage()
    const container = await table()
    expect(screen.queryByLabelText('Niveau déclaré')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('En retard seulement')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Délai'), 'Dans le délai')
    expect(rows(container)).toHaveLength(2)
    await user.selectOptions(screen.getByLabelText('Délai'), 'En retard')
    expect(rows(container)).toHaveLength(1)
    await user.selectOptions(screen.getByLabelText('Délai'), 'Tous')

    await user.selectOptions(screen.getByLabelText('Agence'), 'Agence Démo Nord')
    expect(rows(container).map((row) => row.textContent)).toEqual([expect.stringContaining('Lucie Exemple')])
    await user.selectOptions(screen.getByLabelText('Agence'), 'Toutes les agences')

    await user.selectOptions(screen.getByLabelText('Type de document'), 'Diplôme')
    expect(rows(container)).toHaveLength(2)
  })
})

describe('US-133 CA-04 — le tableau', () => {
  it('du plus ancien au plus récent, avec le délai, qui l’a pris et « Examiner »', async () => {
    renderPage()
    const container = await table()
    const cells = rows(container).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))
    expect(cells[0]).toEqual(['Paul DémoEMP-0204 · Agence Démo Sud', 'Diplôme · Licence en Finance', 'Licence', '8 oct.', 'En retard · 7 j', 'Non assigné', 'Examiner'])
    expect(cells[1]).toEqual(expect.arrayContaining(['Jour 3 sur 5', 'Vous']))
    expect(cells[2]).toEqual(expect.arrayContaining(['Jour 2 sur 5', 'autre.agent']))
    expect(within(rows(container)[0]).getByRole('link', { name: 'Examiner' })).toHaveAttribute('href', '/admin/validation/c1')
    expect(screen.getByText('1 à 3 sur 3, du plus ancien au plus récent')).toBeVisible()
  })

  it('20 par page, avec « Précédent » et « Suivant »', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 23 }, (_, index) =>
      item(`m${index}`, { submitted_at: `2026-10-${String(index + 1).padStart(2, '0')}T09:00:00Z` }),
    )
    getValidationQueue.mockResolvedValue({ items: many, total_waiting: 23, total_overdue: 23 })
    renderPage()
    const container = await table()
    expect(rows(container)).toHaveLength(20)
    expect(screen.getByText('1 à 20 sur 23, du plus ancien au plus récent')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(rows(container)).toHaveLength(3)
    expect(screen.getByText('21 à 23 sur 23, du plus ancien au plus récent')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
  })

  it('file vide : une phrase le dit', async () => {
    getValidationQueue.mockResolvedValue({ items: [], total_waiting: 0, total_overdue: 0 })
    renderPage()
    expect(await screen.findByText('Aucun certificat en attente de validation.')).toBeVisible()
  })
})
