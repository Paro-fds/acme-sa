import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import * as validationApi from '../../../api/validation.js'
import ValidationQueuePage from './ValidationQueuePage.jsx'

const MOCK_QUEUE = {
  items: [
    {
      certificate_id: 'cert-1',
      employee_id: 'emp-1',
      employee_name: 'Paul Démo',
      employee_code: 'EMP-0204',
      agency_code: 'SUD',
      agency_name: 'Agence Démo Sud',
      title: 'Licence en Finance',
      certificate_type: 'DIPLOME',
      certificate_type_label: 'Diplôme',
      declared_level: 'LICENCE',
      declared_level_label: 'Licence',
      submitted_at: '2026-09-24T10:00:00Z',
      business_days: 9,
      is_overdue: true,
      status: 'RECEIVED',
      assigned_to: null,
      assigned_at: null,
    },
    {
      certificate_id: 'cert-2',
      employee_id: 'emp-2',
      employee_name: 'Lucie Exemple',
      employee_code: 'EMP-0418',
      agency_code: 'NORD',
      agency_name: 'Agence Démo Nord',
      title: 'Licence en Sciences comptables',
      certificate_type: 'DIPLOME',
      certificate_type_label: 'Diplôme',
      declared_level: 'LICENCE',
      declared_level_label: 'Licence',
      submitted_at: '2026-10-03T09:12:00Z',
      business_days: 3,
      is_overdue: false,
      status: 'IN_REVIEW',
      assigned_to: 'Agent RH Démo 1',
      assigned_at: '2026-10-06T14:05:00Z',
    },
  ],
  total_waiting: 2,
  total_overdue: 1,
}

describe('ValidationQueuePage (US-401)', () => {
  it('CA-01 : affiche le titre, les métriques et les lignes avec retard en alerte', async () => {
    vi.spyOn(validationApi, 'getValidationQueue').mockResolvedValue(MOCK_QUEUE)

    render(
      <MemoryRouter initialEntries={['/admin/validation']}>
        <Routes>
          <Route path="/admin/validation" element={<ValidationQueuePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'File de validation des certificats' })).toBeInTheDocument()
    expect(screen.getByText(/2 certificats en attente · 1 en retard/)).toBeInTheDocument()

    // Ligne en retard
    expect(screen.getAllByText(/Paul Démo · EMP-0204/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/En retard \(9 j\)/)[0]).toBeInTheDocument()

    // Ligne en cours
    expect(screen.getAllByText(/Lucie Exemple · EMP-0418/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/En cours — Agent RH Démo 1/)[0]).toBeInTheDocument()

    // Note d'information
    expect(
      screen.getByText(/Vos propres certificats n'apparaissent pas dans votre file/),
    ).toBeInTheDocument()
  })

  it('CA-02 : « Prendre le suivant » appelle claimNextCertificate et navigue', async () => {
    const user = userEvent.setup()
    vi.spyOn(validationApi, 'getValidationQueue').mockResolvedValue(MOCK_QUEUE)
    const claimSpy = vi.spyOn(validationApi, 'claimNextCertificate').mockResolvedValue({
      claimed: true,
      certificate_id: 'cert-1',
    })

    render(
      <MemoryRouter initialEntries={['/admin/validation']}>
        <Routes>
          <Route path="/admin/validation" element={<ValidationQueuePage />} />
          <Route path="/admin/validation/:id" element={<p>Examen du certificat cert-1</p>} />
        </Routes>
      </MemoryRouter>,
    )

    const claimBtn = await screen.findByRole('button', { name: /Prendre le suivant/ })
    await user.click(claimBtn)

    expect(claimSpy).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Examen du certificat cert-1')).toBeInTheDocument()
  })
})
