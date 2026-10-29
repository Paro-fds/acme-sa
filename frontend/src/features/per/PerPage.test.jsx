import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { downloadStatementPdf, getMyPayslips, getMyPer } from '../../api/per.js'
import PerBalancePage from './PerBalancePage.jsx'
import PerPage from './PerPage.jsx'
import PerPayslipPage from './PerPayslipPage.jsx'
import PerStatementPage from './PerStatementPage.jsx'

vi.mock('../../api/per.js', () => ({
  getMyPer: vi.fn(),
  getMyPayslips: vi.fn(),
  downloadStatementPdf: vi.fn(),
  payslipSheetUrl: (period) => `/api/me/per/payslips/${period}.html`,
}))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))
// US-1024 : « aujourd'hui » fixé au 29/10/2026 pour la date de fin proposée
vi.mock('./statementDates.js', async (original) => ({ ...(await original()), todayIso: () => '2026-10-29' }))

const SEPTEMBER = {
  period: '2026-09',
  period_label: 'septembre 2026',
  updated_on: '30/09/2026',
  reported_on: '2026-09-30',
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
  reported_on: '2026-08-31',
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

function renderPage(path = '/per') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/per" element={<PerPage />} />
        <Route path="/per/balance" element={<PerBalancePage />} />
        <Route path="/per/releve" element={<PerStatementPage />} />
        <Route path="/per/fiche" element={<PerPayslipPage />} />
      </Routes>
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

describe('US-1023 — le menu de « Mon PER »', () => {
  it('CA-01 : trois choix ; chacun ouvre sa page, « Menu principal » ramène au menu', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage()

    const menu = screen.getByRole('list', { name: 'Documents du PER' })
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/per/balance', '/per/releve', '/per/fiche'])
    await user.click(within(menu).getByRole('link', { name: /Balance PER/ }))
    expect(await screen.findByRole('heading', { name: 'Balance PER', level: 1 })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Menu principal' }))
    expect(screen.getByRole('list', { name: 'Documents du PER' })).toBeInTheDocument()
  })

  it('CA-02 : la dernière balance, centrée, en USD, avec le mois et la date', async () => {
    renderPage('/per/balance')

    const balance = await screen.findByRole('region', { name: 'Ma balance PER' })
    expect(within(balance).getByText('121.480,75 USD')).toHaveClass('text-center')
    expect(balance).toHaveTextContent('Septembre 2026 · mise à jour le 30/09/2026')
  })

  it('CA-02 : sans balance, un message clair, pas une erreur', async () => {
    getMyPer.mockRejectedValue(new ApiError(404, 'NO_BALANCE', "Aucune balance n'est disponible pour le moment."))
    renderPage('/per/balance')

    expect(await screen.findByText("Aucune balance n'est disponible pour le moment.")).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CA-03 : la mention de la DRH sur chaque page', async () => {
    for (const path of ['/per/balance', '/per/releve', '/per/fiche']) {
      renderPage(path)
      expect(
        await screen.findByText('Une question sur votre PER ou votre paie ? Adressez-vous à la DRH.'),
      ).toBeVisible()
      cleanup()
    }
  })
})

describe('US-1024 — Relevé PER entre deux dates', () => {
  it('CA-01 : les mois en base et deux dates proposées (première photo, aujourd’hui)', async () => {
    renderPage('/per/releve')

    expect(await screen.findByText('Photos en base : août 2026, septembre 2026.')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de début')).toHaveValue('31/08/2026')
    expect(screen.getByLabelText('Date de fin')).toHaveValue('29/10/2026')
  })

  it('CA-01 : la date se tape en chiffres, les barres se placent seules', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/releve')
    const start = await screen.findByLabelText('Date de début')

    await user.clear(start)
    await user.type(start, '01082026')

    expect(start).toHaveValue('01/08/2026')
  })

  it('CA-01 : date illisible, puis début après fin', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/releve')
    const start = await screen.findByLabelText('Date de début')

    await user.clear(start)
    await user.type(start, '31022026')
    await user.click(screen.getByRole('button', { name: 'Afficher le relevé' }))
    expect(screen.getByRole('alert')).toHaveTextContent("Indiquez le jour, le mois et l'année, par exemple 31/01/2026.")

    await user.clear(start)
    await user.type(start, '01112026')
    await user.click(screen.getByRole('button', { name: 'Afficher le relevé' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La date de début est postérieure à la date de fin.')
    expect(screen.queryByRole('button', { name: 'Relevé en PDF' })).not.toBeInTheDocument()
  })

  it('CA-02 : les photos de l’intervalle, de la plus ancienne à la plus récente, avec les comptes', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/releve')
    await screen.findByText(/Photos en base/)
    const start = screen.getByLabelText('Date de début')
    await user.clear(start)
    await user.type(start, '01082026')

    await user.click(screen.getByRole('button', { name: 'Afficher le relevé' }))

    const months = within(screen.getByRole('list', { name: 'Relevé PER' })).getAllByRole('listitem')
    expect(months.map((month) => within(month).getByRole('heading').textContent)).toEqual([
      'Août 2026',
      'Septembre 2026',
    ])
    expect(months[0]).toHaveTextContent('Au 31/08/2026 · balance 118.250,00 · intérêt cumulé 2.455,10')
    expect(within(months[0]).getByRole('table')).toHaveTextContent('PER-FICTIF-01')
    expect(
      screen.getByText('Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.'),
    ).toBeVisible()
  })

  it('CA-02 : aucune photo dans l’intervalle', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/releve')
    const end = await screen.findByLabelText('Date de fin')
    await user.clear(end)
    await user.type(end, '15092026')
    const start = screen.getByLabelText('Date de début')
    await user.clear(start)
    await user.type(start, '01092026')

    await user.click(screen.getByRole('button', { name: 'Afficher le relevé' }))

    expect(screen.getByText('Aucune photo PER entre ces deux dates.')).toBeVisible()
  })

  it('CA-03 : « Relevé en PDF » demande le fichier des deux dates affichées et l’enregistre', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    downloadStatementPdf.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    const createObjectURL = vi.fn(() => 'blob:releve')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage('/per/releve')
    await screen.findByText(/Photos en base/)

    await user.click(screen.getByRole('button', { name: 'Afficher le relevé' }))
    await user.click(screen.getByRole('button', { name: 'Relevé en PDF' }))

    expect(downloadStatementPdf).toHaveBeenCalledWith('2026-08-31', '2026-10-29')
    expect(click).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Le relevé PDF a été enregistré.')
  })

  it('stockage en panne, service momentanément indisponible', async () => {
    getMyPer.mockRejectedValue(new ApiError(503, 'PER_UNAVAILABLE', 'Service momentanément indisponible.'))
    renderPage('/per/releve')

    expect(await screen.findByRole('alert')).toHaveTextContent('Service momentanément indisponible.')
  })
})

describe('US-1022 — Fiche de paie', () => {
  it('US-1022 CA-01 : la fiche du mois le plus récent, au format du directeur, et « Enregistrer en PDF »', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/fiche')

    const frame = await screen.findByTitle('Fiche de paie de septembre 2026')
    expect(frame).toHaveAttribute('src', '/api/me/per/payslips/2026-09.html')
    const print = vi.fn()
    Object.defineProperty(frame, 'contentWindow', { value: { focus: vi.fn(), print }, configurable: true })
    await user.click(screen.getByRole('button', { name: 'Enregistrer en PDF' }))
    expect(print).toHaveBeenCalled()
  })

  it('US-1022 CA-03 : les autres mois sous la fiche ; un clic remplace la fiche et déplace le surlignage', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage('/per/fiche')

    const months = await screen.findByRole('list', { name: 'Mois disponibles' })
    expect(within(months).getByRole('button', { name: 'Septembre 2026' })).toHaveAttribute('aria-current', 'true')
    await user.click(within(months).getByRole('button', { name: 'Août 2026' }))

    expect(screen.getByTitle('Fiche de paie de août 2026')).toHaveAttribute('src', '/api/me/per/payslips/2026-08.html')
    expect(within(months).getByRole('button', { name: 'Août 2026' })).toHaveAttribute('aria-current', 'true')
    expect(within(months).getByRole('button', { name: 'Septembre 2026' })).not.toHaveAttribute('aria-current')
  })

  it('US-1022 CA-03 : sans fiche, le message du module du directeur', async () => {
    getMyPayslips.mockResolvedValue([])
    renderPage('/per/fiche')

    expect(await screen.findByText("Aucune fiche de paie n'est disponible pour le moment.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer en PDF' })).not.toBeInTheDocument()
  })
})
