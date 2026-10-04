import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDocuments from './AdminDocuments.jsx'

const DIPLOMA = {
  id: 'd1',
  document_type: 'DIPLOME',
  type_label: 'Diplôme',
  original_name: 'Diplôme licence.pdf',
  content_type: 'application/pdf',
  size_bytes: 250 * 1024,
  uploaded_at: '2026-10-04T09:00:00',
}

const CERTIFICATE = {
  id: 'c2',
  document_type: 'CERTIFICAT',
  type_label: 'Certificat',
  original_name: 'certificat.jpg',
  content_type: 'image/jpeg',
  size_bytes: 1.5 * 1024 * 1024,
  uploaded_at: '2026-10-05T10:15:00',
}

const block = () => screen.getByRole('region', { name: 'Documents' })

describe('AdminDocuments (US-21)', () => {
  it('CA-01 : chaque document avec son type, son nom, sa date et sa taille', () => {
    render(<AdminDocuments documents={[DIPLOMA, CERTIFICATE]} />)

    expect(within(block()).getByText('2 documents')).toBeInTheDocument()
    const [diploma, certificate] = within(block()).getAllByRole('listitem')
    expect(within(diploma).getByText('Diplôme')).toBeInTheDocument()
    expect(within(diploma).getByText('Diplôme licence.pdf')).toBeInTheDocument()
    expect(within(diploma).getByText('Ajouté le 04/10/2026')).toBeInTheDocument()
    expect(within(diploma).getByText('250 Ko')).toBeInTheDocument()
    expect(within(certificate).getByText('Certificat')).toBeInTheDocument()
    expect(within(certificate).getByText('certificat.jpg')).toBeInTheDocument()
    expect(within(certificate).getByText('Ajouté le 05/10/2026')).toBeInTheDocument()
    expect(within(certificate).getByText('1,5 Mo')).toBeInTheDocument()
  })

  it('CA-02 : « Voir » sur une image → aperçu plein écran, avec un bouton de fermeture', async () => {
    const user = userEvent.setup()
    render(<AdminDocuments documents={[DIPLOMA, CERTIFICATE]} />)

    await user.click(screen.getByRole('button', { name: 'Voir certificat.jpg' }))

    const preview = screen.getByRole('dialog', { name: 'certificat.jpg' })
    expect(within(preview).getByRole('img', { name: 'certificat.jpg' })).toHaveAttribute('src', '/api/admin/documents/c2/file')
    await user.click(within(preview).getByRole('button', { name: 'Fermer l’aperçu' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-02 : « Voir » sur un PDF → nouvel onglet, par la route admin', () => {
    render(<AdminDocuments documents={[DIPLOMA]} />)

    const link = screen.getByRole('link', { name: 'Voir Diplôme licence.pdf' })
    expect(link).toHaveAttribute('href', '/api/admin/documents/d1/file')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('CA-03 : aucun document → « Aucun document transmis »', () => {
    render(<AdminDocuments documents={[]} />)

    expect(within(block()).getByText('Aucun document transmis')).toBeInTheDocument()
    expect(within(block()).queryByRole('list')).not.toBeInTheDocument()
  })

  it('CA-06 : lecture seule, aucun bouton d’ajout ni de suppression', () => {
    render(<AdminDocuments documents={[DIPLOMA, CERTIFICATE]} />)

    expect(screen.queryByRole('button', { name: /supprimer|ajouter/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/supprimer|ajouter/i)).not.toBeInTheDocument()
    const actions = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')].map((element) =>
      element.getAttribute('aria-label'),
    )
    expect(actions).toEqual(['Voir certificat.jpg', 'Voir Diplôme licence.pdf'])
  })
})
