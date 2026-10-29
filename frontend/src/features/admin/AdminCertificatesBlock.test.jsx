import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminCertificatesBlock from './AdminCertificatesBlock.jsx'

const SAMPLE_CERTS = [
  {
    id: 'cert-1',
    certificate_type: 'DIPLOME',
    type_label: 'Diplôme',
    level: 'LICENCE',
    level_label: 'Licence',
    title: 'Licence en sciences comptables',
    institution: 'Université Démo',
    year: 2019,
    status: 'VALIDATED',
    status_label: 'Validé',
    submitted_at: '2026-10-01T10:00:00Z',
    decided_by: 'Agent RH Démo 2',
    decided_at: '2026-10-02T14:30:00Z',
    is_archived: true,
    replaces_id: null,
    history: [
      { id: 1, action: 'VALIDATED', actor_name: 'Agent RH Démo 2', details: 'Validé par Agent RH Démo 2', at: '2026-10-02T14:30:00Z' },
      { id: 2, action: 'REPLACED', actor_name: 'Lucie Exemple', details: 'Remplacé par le certificat cert-2', at: '2026-10-04T09:00:00Z' },
    ],
  },
  {
    id: 'cert-2',
    certificate_type: 'DIPLOME',
    type_label: 'Diplôme',
    level: 'MASTER',
    level_label: 'Master',
    title: 'Master en Audit et Contrôle',
    institution: 'Université Démo',
    year: 2021,
    status: 'VALIDATED',
    status_label: 'Validé',
    submitted_at: '2026-10-04T09:00:00Z',
    decided_by: 'Agent RH Démo 1',
    decided_at: '2026-10-05T11:00:00Z',
    is_archived: false,
    replaces_id: 'cert-1',
    history: [
      { id: 3, action: 'VALIDATED', actor_name: 'Agent RH Démo 1', details: 'Validé par Agent RH Démo 1', at: '2026-10-05T11:00:00Z' },
    ],
  },
]

describe('AdminCertificatesBlock (US-304 & Maquette A7)', () => {
  it('CA-02 : affiche le certificat validé et l’ancien archivé avec son historique', async () => {
    const user = userEvent.setup()
    render(<AdminCertificatesBlock certificates={SAMPLE_CERTS} />)

    // Bloc avec 2 certificats
    expect(screen.getByRole('heading', { name: 'Certificats' })).toBeInTheDocument()
    expect(screen.getByText('2 certificats enregistrés')).toBeInTheDocument()

    // 1. Ancien certificat remplacé : marqué archivé
    expect(screen.getByText('Licence en sciences comptables')).toBeInTheDocument()
    expect(screen.getByText('Archivé (remplacé)')).toBeInTheDocument()

    // 2. Nouveau certificat actif : marqué validé
    expect(screen.getByText('Master en Audit et Contrôle')).toBeInTheDocument()
    expect(screen.getByText('Validé')).toBeInTheDocument()

    // Liens vers les documents
    const links = screen.getAllByRole('link', { name: /Voir le document/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/api/admin/validation/cert-1/file')
    expect(links[1]).toHaveAttribute('href', '/api/admin/validation/cert-2/file')

    // 3. Consultation de l'historique de décisions de l'ancien certificat
    const historyButtons = screen.getAllByRole('button', { name: /Historique des décisions/i })
    await user.click(historyButtons[0])

    expect(screen.getByText('Validé par Agent RH Démo 2')).toBeInTheDocument()
    expect(screen.getByText('Remplacé par le certificat cert-2')).toBeInTheDocument()
  })

  it('ne s’affiche pas si aucun certificat n’est déposé', () => {
    const { container } = render(<AdminCertificatesBlock certificates={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
