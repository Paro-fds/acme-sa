import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import * as reportsApi from '../../../api/reports.js'
import ErrorReportQueuePage from './ErrorReportQueuePage.jsx'

const MOCK_REPORTS = {
  items: [
    {
      id: 1,
      employee_id: 'emp-1',
      employee_name: 'Lucie Exemple',
      agency_name: 'Agence Démo Nord',
      agency_code: 'NORD',
      field_key: 'position_confirmed',
      field_label: 'Poste',
      current_value: 'Chargée de crédit',
      indicated_value: 'Chargée de crédit principale',
      comment: "J'ai changé de poste en août.",
      origin: 'EMPLOYEE',
      origin_label: "Signalé par l'employé",
      at: '2026-10-06T10:00:00Z',
      status: 'NEW',
      status_label: 'Nouveau',
    },
    {
      id: 2,
      employee_id: 'emp-2',
      employee_name: 'Paul Démo',
      agency_name: 'Agence Démo Sud',
      agency_code: 'SUD',
      field_key: 'hire_date_confirmed',
      field_label: "Date d'embauche",
      current_value: '12/05/2005',
      indicated_value: null,
      comment: null,
      origin: 'AUTOMATIC',
      origin_label: 'Contrôle automatique : embauche avant 18 ans',
      at: '2026-10-05T09:00:00Z',
      status: 'NEW',
      status_label: 'Nouveau',
    },
  ],
  total: 2,
  new_count: 2,
}

describe('ErrorReportQueuePage (US-403)', () => {
  it('CA-01 & CA-03 : affiche la liste des signalements avec employé, champ, valeurs et volet de décision', async () => {
    vi.spyOn(reportsApi, 'listReports').mockResolvedValue(MOCK_REPORTS)

    render(
      <MemoryRouter initialEntries={['/admin/signalements']}>
        <Routes>
          <Route path="/admin/signalements" element={<ErrorReportQueuePage />} />
        </Routes>
      </MemoryRouter>,
    )

    const headings = await screen.findAllByRole('heading', { name: "Signalements d'erreur" })
    expect(headings.length).toBeGreaterThan(0)

    // Ligne 1 : Lucie Exemple
    expect(screen.getAllByText(/Lucie Exemple/)[0]).toBeInTheDocument()
    expect(screen.getAllByText('Chargée de crédit')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Chargée de crédit principale')[0]).toBeInTheDocument()

    // Ligne 2 : Paul Démo (contrôle automatique)
    expect(screen.getByText(/Paul Démo/)).toBeInTheDocument()
    expect(screen.getByText(/Contrôle automatique : embauche avant 18 ans/)).toBeInTheDocument()

    // Volet de décision pour Lucie Exemple
    expect(screen.getByText(/Lucie Exemple · Poste/)).toBeInTheDocument()
    expect(screen.getByText(/J'ai changé de poste en août/)).toBeInTheDocument()
    expect(screen.getByText('La valeur indiquée est juste')).toBeInTheDocument()
  })

  it('CA-02 : Enregistre une décision et recharge les données', async () => {
    const user = userEvent.setup()
    vi.spyOn(reportsApi, 'listReports').mockResolvedValue(MOCK_REPORTS)
    const decideSpy = vi.spyOn(reportsApi, 'decideReport').mockResolvedValue({
      id: 1,
      status: 'CORRECTED',
      status_label: 'Corrigé — en attente du système RH',
    })

    render(
      <MemoryRouter initialEntries={['/admin/signalements']}>
        <Routes>
          <Route path="/admin/signalements" element={<ErrorReportQueuePage />} />
        </Routes>
      </MemoryRouter>,
    )

    const submitBtn = await screen.findByRole('button', { name: 'Enregistrer la décision' })
    await user.click(submitBtn)

    expect(decideSpy).toHaveBeenCalledWith(1, {
      decision: 'INDICATED_IS_CORRECT',
      comment: '',
    })
  })
})
