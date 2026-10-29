import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { depositPiece, listMyPieces } from '../../api/pieces.js'
import { ApiError } from '../../api/client.js'
import { getProfile } from '../../api/employee.js'
import PieceDepositPage from './PieceDepositPage.jsx'
import PiecesPage from './PiecesPage.jsx'

vi.mock('../../api/pieces.js', () => ({
  listMyPieces: vi.fn(),
  depositPiece: vi.fn(),
  pieceFileUrl: (id) => `/api/me/pieces/${id}/file`,
}))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))
vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../lib/resizeImage.js', () => ({
  resizeImage: (file) => Promise.resolve(file),
}))

const PIECES = [
  {
    id: 3,
    title: 'scan-diplome.pdf',
    type_label: null,
    status: 'a_completer',
    status_label: 'À compléter',
    document_date: '2026-10-20',
    deposited_at: '2026-10-20T12:00:00Z',
    refusal_reason: null,
    has_file: true,
  },
  {
    id: 2,
    title: 'Attestation bureautique',
    type_label: 'Attestation de suivi',
    status: 'refuse',
    status_label: 'Refusée',
    document_date: '2023-02-10',
    deposited_at: '2023-02-11T12:00:00Z',
    refusal_reason: 'Scan illisible',
    has_file: false,
  },
  {
    id: 1,
    title: 'Licence en sciences comptables',
    type_label: 'Licence',
    status: 'valide',
    status_label: 'Approuvée',
    document_date: '2017-07-15',
    deposited_at: '2026-10-18T12:00:00Z',
    refusal_reason: null,
    has_file: true,
  },
]

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/certificats" element={<PiecesPage />} />
        <Route path="/certificats/deposer" element={<PieceDepositPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const COMPLETE = {
  completion: {
    is_complete: true,
    percent: 100,
    complete: 8,
    total: 8,
    elements: [],
  },
}
const INCOMPLETE = {
  completion: {
    is_complete: false,
    percent: 87,
    complete: 7,
    total: 8,
    elements: [{ key: 'address', label: 'Adresse', complete: false }],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  getProfile.mockResolvedValue(COMPLETE)
  listMyPieces.mockResolvedValue(PIECES)
  depositPiece.mockResolvedValue({
    id: 4,
    title: 'Excel',
    status: 'a_completer',
  })
})

describe('US-1008 — Mes certificats, depuis Carrières', () => {
  it('CA-01 : chaque pièce avec son type et son statut de Carrières', async () => {
    renderAt('/certificats')

    const list = await screen.findByRole('list', { name: 'Mes pièces' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('scan-diplome.pdf')
    expect(items[0]).toHaveTextContent('Type à préciser par la DRH')
    expect(items[0]).toHaveTextContent('À compléter')
    expect(items[2]).toHaveTextContent('Licence')
    expect(items[2]).toHaveTextContent('Approuvée')
    expect(within(items[2]).getByRole('link', { name: 'Voir le scan' })).toHaveAttribute(
      'href',
      '/api/me/pieces/1/file',
    )
  })

  it('CA-02 : une pièce refusée montre le motif', async () => {
    renderAt('/certificats')

    const refused = within(await screen.findByRole('list', { name: 'Mes pièces' })).getAllByRole('listitem')[1]
    expect(refused).toHaveTextContent('Refusée')
    expect(refused).toHaveTextContent('Motif : Scan illisible')
    expect(within(refused).queryByRole('link', { name: 'Voir le scan' })).not.toBeInTheDocument()
  })

  it('sans pièce, invite à en déposer une', async () => {
    listMyPieces.mockResolvedValue([])
    renderAt('/certificats')

    expect(await screen.findByText(/Aucune pièce pour le moment/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Déposer une pièce/ })[0]).toHaveAttribute(
      'href',
      '/certificats/deposer',
    )
  })

  it('US-204 : dossier incomplet, la liste de ce qui reste à la place du dépôt', async () => {
    getProfile.mockResolvedValue(INCOMPLETE)
    renderAt('/certificats')

    expect(await screen.findByText(/Il reste 1 information à compléter/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ajouter mon adresse/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Déposer une pièce/ })).not.toBeInTheDocument()
  })
})

describe('US-1008 — Déposer une pièce dans Carrières', () => {
  it('CA-03 : sans fichier, le message est près du champ', async () => {
    const user = userEvent.setup()
    renderAt('/certificats/deposer')

    await user.click(screen.getByRole('button', { name: 'Déposer' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ajoutez une photo ou le PDF de la pièce.')
    expect(depositPiece).not.toHaveBeenCalled()
  })

  it('CA-03 : le fichier et l’intitulé partent, puis retour à la liste avec la confirmation', async () => {
    const user = userEvent.setup()
    renderAt('/certificats/deposer')
    const file = new File(['%PDF-1.7'], 'excel.pdf', {
      type: 'application/pdf',
    })

    await user.upload(screen.getByLabelText('Choisir un fichier'), file)
    await user.type(screen.getByLabelText('Intitulé (facultatif)'), 'Certificat Excel')
    await user.click(screen.getByRole('button', { name: 'Déposer' }))

    expect(depositPiece).toHaveBeenCalledWith(file, 'Certificat Excel', expect.any(Function))
    expect(await screen.findByText('Pièce déposée. La DRH va la compléter, puis la valider.')).toBeInTheDocument()
  })

  it('CA-03 : un refus du serveur s’affiche près du fichier', async () => {
    depositPiece.mockRejectedValue(
      new ApiError(409, 'DUPLICATE_PIECE', 'Vous avez déjà déposé ce fichier. Il est dans vos pièces.', 'file'),
    )
    const user = userEvent.setup()
    renderAt('/certificats/deposer')

    await user.upload(
      screen.getByLabelText('Choisir un fichier'),
      new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: 'Déposer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vous avez déjà déposé ce fichier.')
  })
})
