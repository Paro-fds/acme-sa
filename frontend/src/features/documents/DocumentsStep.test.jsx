import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import DocumentsStep from './DocumentsStep.jsx'
import { deleteDocument, listMyDocuments, uploadDocument } from '../../api/documents.js'
import { getMyUpdate } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'
import { resizeImage } from './resizeImage.js'

vi.mock('../../api/documents.js', () => ({ listMyDocuments: vi.fn(), uploadDocument: vi.fn(), deleteDocument: vi.fn() }))
vi.mock('../../api/employee.js', () => ({ getMyUpdate: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))
vi.mock('./resizeImage.js', () => ({ resizeImage: vi.fn() }))

const MB = 1024 * 1024
const pdf = (name = 'licence.pdf', size = MB) => new File([new Uint8Array(size)], name, { type: 'application/pdf' })
const jpeg = (name = 'photo.jpg') => new File([new Uint8Array(2 * MB)], name, { type: 'image/jpeg' })

const stored = (index, overrides = {}) => ({
  id: `d${index}`,
  document_type: 'DIPLOME',
  type_label: 'Diplôme',
  original_name: `document${index}.pdf`,
  content_type: 'application/pdf',
  size_bytes: 245760,
  uploaded_at: '2026-10-04T14:32:00',
  ...overrides,
})

function renderStep({ documents = [], state = 'IN_PROGRESS' } = {}) {
  getMyUpdate.mockResolvedValue({ state, changes: [] })
  listMyDocuments.mockResolvedValue(documents)
  render(
    <MemoryRouter initialEntries={['/mise-a-jour/documents']}>
      <Routes>
        <Route path="/profil" element={<p>Écran profil</p>} />
        <Route path="/mise-a-jour/documents" element={<DocumentsStep />} />
        <Route path="/mise-a-jour/verification" element={<p>Étape 3 : Vérification</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return state === 'IN_PROGRESS' ? screen.findByRole('heading', { name: 'Nouveau document' }) : null
}

const fileInput = () => screen.getByLabelText('Choisir un fichier du téléphone')
const cameraInput = () => screen.getByLabelText('Prendre une photo')
const typeChoice = (label) => screen.getByRole('radio', { name: label })
const addedList = () => screen.getByRole('region', { name: 'Documents ajoutés' })

async function chooseTypeAndUpload(user, file, type = 'Diplôme', input = fileInput) {
  await user.click(typeChoice(type))
  await user.upload(input(), file)
}

describe('DocumentsStep (US-13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resizeImage.mockImplementation(async (file) => file)
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:miniature')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('le stepper indique l’étape 2 sur 4 et rappelle les formats acceptés', async () => {
    await renderStep()

    expect(screen.getByText('Étape 2 sur 4 : Documents')).toBeInTheDocument()
    expect(screen.getByText(/Formats acceptés : PDF, JPG, PNG — 5 Mo maximum/)).toBeInTheDocument()
  })

  it('CA-01 : un PDF de type Diplôme est envoyé puis listé avec son nom, son type et une icône PDF', async () => {
    uploadDocument.mockResolvedValue(stored(1, { original_name: 'licence.pdf', size_bytes: MB }))
    await renderStep()
    const user = userEvent.setup()

    await chooseTypeAndUpload(user, pdf())

    expect(uploadDocument).toHaveBeenCalledWith(expect.any(File), 'DIPLOME', { onProgress: expect.any(Function) })
    const item = within(addedList()).getByText('licence.pdf').closest('li')
    expect(within(item).getByText('Diplôme')).toBeInTheDocument()
    expect(within(item).getByText('1 Mo')).toBeInTheDocument()
    expect(within(item).getByRole('img', { name: 'PDF' })).toBeInTheDocument()
  })

  it('CA-02 : une photo est réduite avant l’envoi et affichée avec une miniature', async () => {
    const original = jpeg()
    const reduced = new File(['réduite'], 'photo.jpg', { type: 'image/jpeg' })
    resizeImage.mockResolvedValue(reduced)
    uploadDocument.mockResolvedValue(stored(1, { original_name: 'photo.jpg', content_type: 'image/jpeg' }))
    await renderStep()
    const user = userEvent.setup()

    await chooseTypeAndUpload(user, original, 'Certificat', cameraInput)

    expect(resizeImage).toHaveBeenCalledWith(original)
    expect(uploadDocument).toHaveBeenCalledWith(reduced, 'CERTIFICAT', expect.anything())
    const thumbnail = await within(addedList()).findByRole('img', { name: 'Aperçu de photo.jpg' })
    expect(thumbnail).toHaveAttribute('src', 'blob:miniature')
    expect(cameraInput()).toHaveAttribute('capture', 'environment')
  })

  it('CA-03 : plusieurs documents sont listés', async () => {
    await renderStep({ documents: [stored(1), stored(2)] })
    uploadDocument.mockResolvedValue(stored(3, { original_name: 'attestation.pdf', type_label: 'Attestation' }))
    const user = userEvent.setup()

    await chooseTypeAndUpload(user, pdf('attestation.pdf'), 'Attestation')

    expect(within(addedList()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(addedList()).getByText('3 fichiers')).toBeInTheDocument()
  })

  it('CA-04 : un format non accepté est refusé avant l’envoi', async () => {
    await renderStep()
    const user = userEvent.setup({ applyAccept: false })

    await chooseTypeAndUpload(user, new File(['PK'], 'cv.docx', { type: 'application/msword' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Format non accepté. Utilisez un PDF, JPG ou PNG.')
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  it('CA-04 : un faux PDF refusé par le serveur affiche le même message', async () => {
    uploadDocument.mockRejectedValue(
      new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Format non accepté. Utilisez un PDF, JPG ou PNG.', 'file'),
    )
    await renderStep()

    await chooseTypeAndUpload(userEvent.setup(), pdf('virus.pdf'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Format non accepté. Utilisez un PDF, JPG ou PNG.')
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument()
  })

  it('CA-05 : un fichier de plus de 5 Mo est refusé immédiatement, sans envoi', async () => {
    await renderStep()

    await chooseTypeAndUpload(userEvent.setup(), pdf('gros.pdf', 6 * MB))

    expect(screen.getByRole('alert')).toHaveTextContent('Fichier trop volumineux (5 Mo maximum).')
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  it('CA-06 : avec 10 documents, l’ajout est désactivé avec le message', async () => {
    await renderStep({ documents: Array.from({ length: 10 }, (_, index) => stored(index)) })

    expect(screen.getByText('Nombre maximum de documents atteint (10).')).toBeInTheDocument()
    expect(fileInput()).toBeDisabled()
    expect(cameraInput()).toBeDisabled()
  })

  it('CA-06 : le refus du serveur (limite atteinte) désactive aussi l’ajout', async () => {
    uploadDocument.mockRejectedValue(new ApiError(409, 'DOCUMENT_LIMIT_REACHED', 'Nombre maximum de documents atteint (10).'))
    await renderStep()

    await chooseTypeAndUpload(userEvent.setup(), pdf())

    expect(await screen.findByRole('alert')).toHaveTextContent('Nombre maximum de documents atteint (10).')
    expect(fileInput()).toBeDisabled()
  })

  it('CA-07 : sans type choisi, l’envoi est impossible', async () => {
    await renderStep()

    expect(fileInput()).toBeDisabled()
    expect(cameraInput()).toBeDisabled()
    expect(screen.getByText('Choisissez d’abord le type de document.')).toBeInTheDocument()
    await userEvent.setup().click(typeChoice('Autre'))
    expect(fileInput()).toBeEnabled()
    expect(typeChoice('Autre')).toBeChecked()
  })

  it('CA-08 : « Passer cette étape » ouvre la vérification sans document', async () => {
    await renderStep()

    await userEvent.setup().click(screen.getByRole('button', { name: /Passer cette étape/ }))

    expect(await screen.findByText('Étape 3 : Vérification')).toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  it('« Continuer vers la vérification » ouvre l’étape 3', async () => {
    await renderStep()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuer vers la vérification' }))

    expect(await screen.findByText('Étape 3 : Vérification')).toBeInTheDocument()
  })

  it('CA-09 : une barre de progression est affichée pendant l’envoi', async () => {
    let finish
    uploadDocument.mockImplementation((file, type, { onProgress }) => {
      onProgress(0.4)
      return new Promise((resolve) => (finish = resolve))
    })
    await renderStep()

    await chooseTypeAndUpload(userEvent.setup(), pdf())

    const progress = await screen.findByRole('progressbar', { name: 'Envoi de licence.pdf' })
    expect(progress).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('button', { name: 'Continuer vers la vérification' })).toBeDisabled()
    finish(stored(1, { original_name: 'licence.pdf' }))
    expect(await screen.findByRole('region', { name: 'Documents ajoutés' })).toHaveTextContent('licence.pdf')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('CA-09 : en cas d’échec réseau, le message et « Réessayer » renvoient le même fichier', async () => {
    uploadDocument
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable. Vérifiez votre connexion.'))
      .mockResolvedValueOnce(stored(1, { original_name: 'licence.pdf' }))
    await renderStep()
    const user = userEvent.setup()

    await chooseTypeAndUpload(user, pdf())
    expect(await screen.findByRole('alert')).toHaveTextContent("L'envoi a échoué. Réessayez.")
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(uploadDocument).toHaveBeenCalledTimes(2)
    expect(uploadDocument.mock.calls[1][0]).toBe(uploadDocument.mock.calls[0][0])
    expect(await within(addedList()).findByText('licence.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sans mise à jour en cours (soumise ou non commencée), retour au profil', async () => {
    renderStep({ state: 'DONE' })

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })
})

describe('DocumentsStep — suppression (US-14)', () => {
  beforeEach(() => vi.clearAllMocks())

  async function confirmDeletion(user, name) {
    await user.click(screen.getByRole('button', { name: `Supprimer ${name}` }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }))
  }

  it('CA-01 : le document confirmé disparaît de la liste', async () => {
    deleteDocument.mockResolvedValue(null)
    await renderStep({ documents: [stored(1), stored(2)] })
    const user = userEvent.setup()

    await confirmDeletion(user, 'document1.pdf')

    expect(deleteDocument).toHaveBeenCalledWith('d1')
    expect(within(addedList()).queryByText('document1.pdf')).not.toBeInTheDocument()
    expect(within(addedList()).getByText('1 fichier')).toBeInTheDocument()
  })

  it('CA-01 : supprimer un document sous la limite réactive l’ajout', async () => {
    deleteDocument.mockResolvedValue(null)
    await renderStep({ documents: Array.from({ length: 10 }, (_, index) => stored(index)) })
    const user = userEvent.setup()
    expect(fileInput()).toBeDisabled()

    await confirmDeletion(user, 'document0.pdf')
    await user.click(typeChoice('Autre'))

    expect(fileInput()).toBeEnabled()
    expect(screen.queryByText('Nombre maximum de documents atteint (10).')).not.toBeInTheDocument()
  })

  it('CA-02 : « Annuler » ne supprime rien', async () => {
    await renderStep({ documents: [stored(1)] })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Supprimer document1.pdf' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(deleteDocument).not.toHaveBeenCalled()
    expect(within(addedList()).getByText('document1.pdf')).toBeInTheDocument()
  })

  it('CA-03 : mise à jour soumise entre-temps (409) : retour au profil', async () => {
    deleteDocument.mockRejectedValue(
      new ApiError(409, 'UPDATE_ALREADY_SUBMITTED', 'Votre mise à jour a déjà été soumise : elle ne peut plus être modifiée.'),
    )
    await renderStep({ documents: [stored(1)] })

    await confirmDeletion(userEvent.setup(), 'document1.pdf')

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('un échec réseau affiche un message et le document reste', async () => {
    deleteDocument.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable. Vérifiez votre connexion.'))
    await renderStep({ documents: [stored(1)] })

    await confirmDeletion(userEvent.setup(), 'document1.pdf')

    expect(await screen.findByRole('alert')).toHaveTextContent('La suppression a échoué. Réessayez.')
    expect(within(addedList()).getByText('document1.pdf')).toBeInTheDocument()
  })
})
