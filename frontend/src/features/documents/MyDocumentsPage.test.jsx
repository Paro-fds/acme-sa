import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import MyDocumentsPage from './MyDocumentsPage.jsx'
import { listMyDocuments } from '../../api/documents.js'
import { getMyUpdate } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/documents.js', () => ({
  listMyDocuments: vi.fn(),
  documentFileUrl: (id) => `/api/me/documents/${id}/file`,
}))
vi.mock('../../api/employee.js', () => ({ getMyUpdate: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const doc = (id, document_type, type_label, original_name, content_type) => ({
  id,
  document_type,
  type_label,
  original_name,
  content_type,
  size_bytes: 2.4 * 1024 * 1024,
  uploaded_at: '2026-10-04T14:32:00',
})

const DIPLOMA = doc('d1', 'DIPLOME', 'Diplôme', 'licence.pdf', 'application/pdf')
const CERTIFICATE = doc('d2', 'CERTIFICAT', 'Certificat', 'secourisme.jpg', 'image/jpeg')

function renderPage({ documents = [DIPLOMA, CERTIFICATE], state = 'IN_PROGRESS' } = {}) {
  listMyDocuments.mockResolvedValue(documents)
  getMyUpdate.mockResolvedValue({ state })
  render(
    <MemoryRouter initialEntries={['/documents']}>
      <Routes>
        <Route path="/" element={<p>Écran identification</p>} />
        <Route path="/profil" element={<p>Écran profil</p>} />
        <Route path="/documents" element={<MyDocumentsPage />} />
        <Route path="/mise-a-jour/documents" element={<p>Étape 2 : Documents</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.findByRole('heading', { name: 'Mes documents', level: 2 })
}

const group = (name) => screen.getByRole('region', { name })

describe('MyDocumentsPage (US-07)', () => {
  it('CA-01 : les documents sont regroupés par type, avec nom, date et taille', async () => {
    await renderPage()

    const diplomas = group('Diplômes')
    expect(within(diplomas).getByText('licence.pdf')).toBeInTheDocument()
    expect(within(diplomas).getByText('Ajouté le 04/10/2026')).toBeInTheDocument()
    expect(within(diplomas).getByText('2,4 Mo')).toBeInTheDocument()
    expect(within(diplomas).getByText('1 document')).toBeInTheDocument()
    expect(within(group('Certificats')).getByText('secourisme.jpg')).toBeInTheDocument()
    expect(screen.getByText('2 documents')).toBeInTheDocument()
  })

  it('CA-01 : seuls les groupes non vides sont affichés, dans l’ordre Diplômes, Certificats, Attestations, Autres', async () => {
    await renderPage({
      documents: [
        doc('d3', 'AUTRE', 'Autre', 'permis.pdf', 'application/pdf'),
        CERTIFICATE,
        doc('d4', 'ATTESTATION', 'Attestation', 'travail.pdf', 'application/pdf'),
      ],
    })

    const titles = screen.getAllByRole('region').map((region) => within(region).getByRole('heading').textContent)
    expect(titles).toEqual(['Certificats', 'Attestations', 'Autres'])
  })

  it('CA-02 : sans document, « Aucun document pour le moment » et un bouton vers la mise à jour', async () => {
    await renderPage({ documents: [] })

    expect(screen.getByText('Aucun document pour le moment')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ajouter un document' }))
    expect(await screen.findByText('Étape 2 : Documents')).toBeInTheDocument()
  })

  it('CA-02 : sans mise à jour commencée, le bouton mène au profil (question Oui / Non)', async () => {
    await renderPage({ documents: [], state: 'NOT_DONE' })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mettre à jour mon dossier' }))

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('CA-02 : après soumission, aucun bouton de mise à jour', async () => {
    await renderPage({ documents: [], state: 'DONE' })

    expect(screen.getByText('Aucun document pour le moment')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajouter un document|Mettre à jour/ })).not.toBeInTheDocument()
  })

  it('aucun bouton « Supprimer » sur cette page', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
  })

  it('CA-03 : « Voir » ouvre le PDF dans le lecteur du téléphone', async () => {
    await renderPage()

    const link = within(group('Diplômes')).getByRole('link', { name: 'Voir licence.pdf' })
    expect(link).toHaveAttribute('href', '/api/me/documents/d1/file')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })

  it('CA-03 : « Voir » affiche l’image en aperçu intégré, refermable', async () => {
    await renderPage()
    const user = userEvent.setup()

    expect(within(group('Certificats')).getByRole('img', { name: 'Aperçu de secourisme.jpg' })).toHaveAttribute(
      'src',
      '/api/me/documents/d2/file',
    )
    await user.click(within(group('Certificats')).getByRole('button', { name: 'Voir secourisme.jpg' }))

    const preview = screen.getByRole('dialog', { name: 'secourisme.jpg' })
    expect(within(preview).getByRole('img', { name: 'secourisme.jpg' })).toHaveAttribute('src', '/api/me/documents/d2/file')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sans session, retour à l’identification', async () => {
    listMyDocuments.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    getMyUpdate.mockResolvedValue({ state: 'NOT_DONE' })
    render(
      <MemoryRouter initialEntries={['/documents']}>
        <Routes>
          <Route path="/" element={<p>Écran identification</p>} />
          <Route path="/documents" element={<MyDocumentsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Écran identification')).toBeInTheDocument()
  })
})
