import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import * as validationApi from '../../../api/validation.js'
import ReviewCertificatePage from './ReviewCertificatePage.jsx'

const MOCK_REVIEW = {
  certificate: {
    id: 'cert-1',
    employee_id: 'emp-1',
    certificate_type: 'DIPLOME',
    level: 'LICENCE',
    title: 'Licence en Sciences comptables',
    institution: 'Université Démo',
    year: 2019,
    country: 'Haïti',
    domain: 'COMPTABILITE',
    status: 'IN_REVIEW',
    submitted_at: '2026-10-03T09:12:00Z',
    assigned_to: 'Agent RH Démo 1',
    original_level: null,
    rejection_reason: null,
    rejection_comment: null,
  },
  employee: {
    id: 'emp-1',
    employee_code: 'EMP-0418',
    name: 'Lucie Exemple',
    position: 'Chargée de crédit',
    agency_name: 'Agence Démo Nord',
    hire_date: '2018-03-12',
    is_profile_complete: true,
    declared_level_label: 'Licence',
    already_validated_certificates: ['Baccalauréat (2014)'],
  },
  files: [
    {
      original_name: 'diplome_licence.pdf',
      content_type: 'application/pdf',
      size_bytes: 204800,
    },
  ],
  history: [
    {
      id: 1,
      actor_id: 'Agent RH Démo 1',
      actor_name: 'Agent RH Démo 1',
      action: 'CLAIMED',
      details: 'Pris en charge par Agent RH Démo 1',
      at: '2026-10-06T14:05:00Z',
    },
  ],
  business_days: 3,
}

describe('ReviewCertificatePage (US-402)', () => {
  it('CA-01 & CA-02 : affiche le profil à droite, le document et permet de valider', async () => {
    const user = userEvent.setup()
    vi.spyOn(validationApi, 'getCertificateReview').mockResolvedValue(MOCK_REVIEW)
    const decideSpy = vi.spyOn(validationApi, 'decideCertificate').mockResolvedValue({
      status: 'VALIDATED',
    })

    render(
      <MemoryRouter initialEntries={['/admin/validation/cert-1']}>
        <Routes>
          <Route path="/admin/validation/:id" element={<ReviewCertificatePage />} />
          <Route path="/admin/validation" element={<p>Retour à la file</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Licence en Sciences comptables' })).toBeInTheDocument()
    expect(screen.getByText(/Lucie Exemple · EMP-0418/)).toBeInTheDocument()
    expect(screen.getByText(/Chargée de crédit · Agence Démo Nord/)).toBeInTheDocument()
    expect(screen.getByText(/Baccalauréat \(2014\)/)).toBeInTheDocument()

    // Clic sur Valider
    const validerBtn = screen.getByRole('button', { name: 'Valider' })
    await user.click(validerBtn)

    expect(decideSpy).toHaveBeenCalledWith('cert-1', { decision: 'VALIDATED' })
    expect(await screen.findByText('Retour à la file')).toBeInTheDocument()
  })

  it('CA-01 : le rejet ouvre la fenêtre des 10 motifs officiels', async () => {
    const user = userEvent.setup()
    vi.spyOn(validationApi, 'getCertificateReview').mockResolvedValue(MOCK_REVIEW)
    const decideSpy = vi.spyOn(validationApi, 'decideCertificate').mockResolvedValue({
      status: 'TO_CORRECT',
    })

    render(
      <MemoryRouter initialEntries={['/admin/validation/cert-1']}>
        <Routes>
          <Route path="/admin/validation/:id" element={<ReviewCertificatePage />} />
          <Route path="/admin/validation" element={<p>Retour à la file</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Licence en Sciences comptables' })

    // Clic sur Rejeter
    const rejeterBtn = screen.getByRole('button', { name: 'Rejeter' })
    await user.click(rejeterBtn)

    expect(screen.getByRole('heading', { name: 'Rejeter ce certificat' })).toBeInTheDocument()
    expect(screen.getByText('Document illisible ou de mauvaise qualité')).toBeInTheDocument()
    expect(screen.getByText('Doublon d\'un document déjà validé')).toBeInTheDocument()

    // Confirmer le rejet
    const confirmBtn = screen.getByRole('button', { name: 'Confirmer le rejet' })
    await user.click(confirmBtn)

    expect(decideSpy).toHaveBeenCalledWith('cert-1', {
      decision: 'REJECTED',
      reason: 'Document illisible ou de mauvaise qualité',
      comment: '',
    })
    expect(await screen.findByText('Retour à la file')).toBeInTheDocument()
  })
})
