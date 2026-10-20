import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { correctCertificateFields, decideCertificate, getCertificateReview } from '../../../api/validation.js'
import ReviewCertificatePage from './ReviewCertificatePage.jsx'

vi.mock('../../../api/validation.js', () => ({
  getCertificateReview: vi.fn(),
  decideCertificate: vi.fn(),
  correctCertificateFields: vi.fn(),
  getCertificateFileUrl: (id) => `/api/admin/validation/${id}/file`,
}))

const REVIEW = {
  certificate: {
    id: 'cert-1',
    employee_id: 'emp-1',
    certificate_type: 'CERTIFICAT',
    level: 'FORMATION_CONTINUE',
    title: 'Certificat Excel avancé',
    institution: 'Centre de formation de Port-au-Prince',
    year: 2025,
    country: null,
    domain: 'INFORMATIQUE',
    status: 'IN_REVIEW',
    submitted_at: '2026-10-15T09:12:00Z',
    assigned_to: 'admin',
    original_level: null,
    rejection_reason: null,
    rejection_comment: null,
  },
  employee: {
    id: 'emp-1',
    employee_code: 'AC-1001',
    name: 'Jean JOSEPH',
    position: 'Agent de crédit',
    agency_name: 'Pétion-Ville',
    hire_date: '2018-03-12',
    is_profile_complete: true,
    declared_level_label: 'Formation continue / Attestation',
    already_validated_certificates: ['Licence en sciences comptables (2019)'],
    validated_level_label: 'Licence',
  },
  files: [{ original_name: 'certificat-excel.jpg', content_type: 'image/jpeg', size_bytes: 1258291 }],
  history: [{ id: 1, actor_id: 'admin', actor_name: 'admin', action: 'CLAIMED', details: 'Pris en charge', at: '2026-10-19T09:00:00Z' }],
  business_days: 3,
  assigned_to_me: true,
  decide_by: '2026-10-22',
  choices: {
    types: [
      { value: 'DIPLOME', label: 'Diplôme' },
      { value: 'CERTIFICAT', label: 'Certificat' },
    ],
    levels: [
      { value: 'LICENCE', label: 'Licence' },
      { value: 'FORMATION_CONTINUE', label: 'Formation continue / Attestation' },
    ],
    domains: [
      { value: 'INFORMATIQUE', label: 'Informatique' },
      { value: 'COMPTABILITE', label: 'Comptabilité' },
    ],
  },
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/validation/cert-1']}>
      <Routes>
        <Route path="/admin/validation/:id" element={<ReviewCertificatePage />} />
        <Route path="/admin/validation" element={<p>Retour à la file</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const ready = () => screen.findByRole('heading', { name: 'Certificat Excel avancé', level: 2 })

beforeEach(() => {
  vi.clearAllMocks()
  getCertificateReview.mockResolvedValue(REVIEW)
  decideCertificate.mockResolvedValue({})
  correctCertificateFields.mockResolvedValue({})
})

describe('US-133 CA-05 — en-tête de l’examen', () => {
  it('qui l’a déposé, quand, qui l’examine et la date limite', async () => {
    renderPage()
    await ready()
    expect(screen.getByText('Déposé par Jean JOSEPH le 15 oct. 2026 · pris par vous')).toBeVisible()
    expect(screen.getByText('Jour 3 sur 5 · décision avant le 22 oct.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('pris par un autre compte, ou en retard', async () => {
    getCertificateReview.mockResolvedValue({
      ...REVIEW,
      certificate: { ...REVIEW.certificate, assigned_to: 'autre.agent' },
      assigned_to_me: false,
      business_days: 7,
    })
    renderPage()
    await ready()
    expect(screen.getByText('Déposé par Jean JOSEPH le 15 oct. 2026 · pris par autre.agent')).toBeVisible()
    expect(screen.getByText('En retard · 7 j')).toBeVisible()
  })
})

describe('US-133 CA-06 — le document et l’employé', () => {
  it('le fichier, sa taille, « Ouvrir en grand » ; l’employé et ses repères', async () => {
    renderPage()
    await ready()
    const document = screen.getByRole('region', { name: 'Document déposé' })
    expect(document).toHaveTextContent('certificat-excel.jpg · 1,2 Mo')
    expect(within(document).getByRole('link', { name: /Ouvrir en grand/ })).toHaveAttribute('href', '/api/admin/validation/cert-1/file')
    expect(within(document).getByRole('img', { name: 'Certificat de Jean JOSEPH' })).toHaveAttribute('src', '/api/admin/validation/cert-1/file')

    const employee = screen.getByRole('region', { name: 'Jean JOSEPH' })
    expect(employee).toHaveTextContent('JJ')
    expect(employee).toHaveTextContent('AC-1001 · Agent de crédit · Pétion-Ville')
    expect(employee).toHaveTextContent('Profil complet')
    expect(employee).toHaveTextContent('Niveau validé : Licence')
    expect(employee).toHaveTextContent('1 certificat déjà validé')
  })
})

describe('US-133 CA-07 — ce que l’employé a déclaré', () => {
  it('les champs à comparer, avec les listes du serveur ; une correction est enregistrée avant de valider', async () => {
    const user = userEvent.setup()
    renderPage()
    await ready()
    const declared = screen.getByRole('region', { name: 'Ce que l’employé a déclaré' })
    expect(within(declared).getByLabelText('Type')).toHaveValue('CERTIFICAT')
    expect(within(declared).getByLabelText('Année')).toHaveValue(2025)
    expect(within(declared).getByLabelText('Niveau')).toHaveValue('FORMATION_CONTINUE')
    expect(within(declared).getByLabelText('Domaine')).toHaveValue('INFORMATIQUE')
    expect(within(declared).getByLabelText('Établissement')).toHaveValue('Centre de formation de Port-au-Prince')
    expect(within(declared).getByLabelText('Intitulé')).toHaveValue('Certificat Excel avancé')
    expect(within(within(declared).getByLabelText('Domaine')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Aucun',
      'Informatique',
      'Comptabilité',
    ])

    await user.selectOptions(within(declared).getByLabelText('Niveau'), 'LICENCE')
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(correctCertificateFields).toHaveBeenCalledWith('cert-1', expect.objectContaining({ level: 'LICENCE', domain: 'INFORMATIQUE' }))
    expect(decideCertificate).toHaveBeenCalledWith('cert-1', { decision: 'VALIDATED' })
    expect(await screen.findByText('Retour à la file')).toBeVisible()
  })
})

describe('US-133 CA-08 — votre décision', () => {
  it('« Valider » et « Rejeter… » dans la page, avec la phrase d’aide ; plus d’historique', async () => {
    renderPage()
    await ready()
    const decision = screen.getByRole('region', { name: 'Votre décision' })
    expect(within(decision).getByRole('button', { name: 'Valider' })).toBeVisible()
    expect(within(decision).getByRole('button', { name: 'Rejeter…' })).toBeVisible()
    expect(decision).toHaveTextContent('L’employé est prévenu dans le portail. Un rejet demande un motif, choisi dans la liste.')
    expect(screen.queryByText('Historique du traitement')).not.toBeInTheDocument()
  })

  it('« Rejeter… » ouvre les motifs officiels ; le rejet est envoyé avec le motif', async () => {
    const user = userEvent.setup()
    renderPage()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Rejeter…' }))
    expect(screen.getByRole('heading', { name: 'Rejeter ce certificat' })).toBeVisible()
    expect(screen.getByText("Doublon d'un document déjà validé")).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmer le rejet' }))
    expect(decideCertificate).toHaveBeenCalledWith('cert-1', {
      decision: 'REJECTED',
      reason: 'Document illisible ou de mauvaise qualité',
      comment: '',
    })
    expect(await screen.findByText('Retour à la file')).toBeVisible()
  })
})
