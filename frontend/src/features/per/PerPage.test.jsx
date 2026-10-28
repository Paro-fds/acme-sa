import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { getMyPayslips, getMyPer } from '../../api/per.js'
import PerPage from './PerPage.jsx'

vi.mock('../../api/per.js', () => ({
  getMyPer: vi.fn(),
  getMyPayslips: vi.fn(),
  payslipPdfUrl: (period) => `/api/me/per/payslips/${period}.pdf`,
}))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const SEPTEMBER = {
  period: '2026-09',
  period_label: 'septembre 2026',
  updated_on: '30/09/2026',
  amount: '121.480,75',
  interest: '2.455,10',
  accounts: [
    {
      number: 'PER-FICTIF-01',
      opened_on: '15/01/2019',
      amount: '121.480,75',
      interest: '2.455,10',
    },
  ],
}
const AUGUST = {
  ...SEPTEMBER,
  period: '2026-08',
  period_label: 'août 2026',
  updated_on: '31/08/2026',
  amount: '118.250,00',
}

const SLIPS = [
  {
    period: '2026-09',
    period_label: 'septembre 2026',
    paid_on: '30/09/2026',
    earnings: '45.000,00',
    deductions: '6.120,00',
    net: '38.880,00',
    lines: [
      { label: 'Salaire de base', nature: 'gain', amount: '42.000,00' },
      { label: 'IRI', nature: 'retenue', amount: '3.420,00' },
    ],
  },
  {
    period: '2026-08',
    period_label: 'août 2026',
    paid_on: '31/08/2026',
    earnings: '42.000,00',
    deductions: '5.880,00',
    net: '36.120,00',
    lines: [{ label: 'Salaire de base', nature: 'gain', amount: '42.000,00' }],
  },
]

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/per']}>
      <PerPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getMyPer.mockResolvedValue({
    balance: SEPTEMBER,
    statement: [SEPTEMBER, AUGUST],
  })
  getMyPayslips.mockResolvedValue(SLIPS)
})

describe('US-1012 — Mon PER', () => {
  it('CA-01 : la balance la plus récente, sa date et ses comptes', async () => {
    renderPage()

    const balance = await screen.findByRole('region', {
      name: 'Ma balance PER',
    })
    expect(balance).toHaveTextContent('121.480,75')
    expect(balance).toHaveTextContent('Mise à jour le 30/09/2026 (septembre 2026)')
    expect(within(balance).getByRole('list', { name: 'Comptes' })).toHaveTextContent('Compte PER-FICTIF-01')
  })

  it('CA-01 : le relevé, du plus récent au plus ancien', async () => {
    renderPage()

    const rows = within(await screen.findByRole('list', { name: 'Relevé PER' })).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('septembre 2026'),
      expect.stringContaining('août 2026'),
    ])
    expect(rows[1]).toHaveTextContent('118.250,00')
  })

  it('CA-03 : sans balance, un message clair, pas une erreur', async () => {
    getMyPer.mockRejectedValue(new ApiError(404, 'NO_BALANCE', "Aucune balance n'est disponible pour le moment."))
    renderPage()

    expect(await screen.findByText("Aucune balance n'est disponible pour le moment.")).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CA-03 : stockage en panne, service momentanément indisponible', async () => {
    getMyPer.mockRejectedValue(new ApiError(503, 'PER_UNAVAILABLE', 'Service momentanément indisponible.'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Service momentanément indisponible.')
  })

  it('US-1020 : le bulletin le plus récent est ouvert ; un autre mois s’ouvre au clic', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage()

    const months = await screen.findByRole('list', { name: 'Bulletins de paie' })
    expect(within(months).getByRole('button', { name: /septembre 2026 — net 38.880,00/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('list', { name: 'Rubriques de septembre 2026' })).toHaveTextContent('IRI')
    expect(screen.getByText(/net à payer 38.880,00/)).toBeInTheDocument()

    await user.click(within(months).getByRole('button', { name: /août 2026/ }))
    expect(screen.getByRole('list', { name: 'Rubriques de août 2026' })).toBeInTheDocument()
  })

  it('US-1021 : la fiche du mois ouvert se télécharge en PDF', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage()

    const link = await screen.findByRole('link', { name: 'Télécharger la fiche de paie (PDF)' })
    expect(link).toHaveAttribute('href', '/api/me/per/payslips/2026-09.pdf')
    expect(link).toHaveAttribute('download', 'fiche-paie-2026-09.pdf')

    await user.click(
      within(screen.getByRole('list', { name: 'Bulletins de paie' })).getByRole('button', { name: /août 2026/ }),
    )
    expect(link).toHaveAttribute('href', '/api/me/per/payslips/2026-08.pdf')
  })

  it('US-1020 : sans bulletin, le message du module du directeur', async () => {
    getMyPayslips.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText("Aucun bulletin n'est disponible pour le moment.")).toBeInTheDocument()
  })
})
