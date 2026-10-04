import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentItem from './DocumentItem.jsx'

const DOCUMENT = {
  id: 'd1',
  document_type: 'DIPLOME',
  type_label: 'Diplôme',
  original_name: 'licence.pdf',
  content_type: 'application/pdf',
  size_bytes: 245760,
  uploaded_at: '2026-10-04T14:32:00',
}

function renderItem(props = {}) {
  render(
    <ul>
      <DocumentItem document={DOCUMENT} {...props} />
    </ul>,
  )
}

const deleteButton = () => screen.getByRole('button', { name: 'Supprimer licence.pdf' })

describe('DocumentItem — suppression (US-14)', () => {
  it('CA-01 : « Supprimer » demande confirmation, puis supprime', async () => {
    const onDelete = vi.fn().mockResolvedValue(true)
    renderItem({ onDelete })
    const user = userEvent.setup()

    await user.click(deleteButton())

    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer ce document ?' })
    expect(dialog).toHaveTextContent('licence.pdf')
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus()
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    expect(onDelete).toHaveBeenCalledWith(DOCUMENT)
  })

  it('CA-02 : « Annuler » ne supprime rien et referme la confirmation', async () => {
    const onDelete = vi.fn()
    renderItem({ onDelete })
    const user = userEvent.setup()

    await user.click(deleteButton())
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(deleteButton()).toHaveFocus()
  })

  it('Échap annule aussi', async () => {
    const onDelete = vi.fn()
    renderItem({ onDelete })
    const user = userEvent.setup()

    await user.click(deleteButton())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('pendant la suppression, les boutons sont désactivés', async () => {
    let finish
    const onDelete = vi.fn(() => new Promise((resolve) => (finish = resolve)))
    renderItem({ onDelete })
    const user = userEvent.setup()

    await user.click(deleteButton())
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }))

    expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Suppression…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    finish(false)
  })

  it('si la suppression échoue, la confirmation se referme et le document reste', async () => {
    const onDelete = vi.fn().mockResolvedValue(false)
    renderItem({ onDelete })
    const user = userEvent.setup()

    await user.click(deleteButton())
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('licence.pdf')).toBeInTheDocument()
  })

  it('CA-03 : sans suppression possible (mise à jour soumise), aucun bouton « Supprimer »', () => {
    renderItem()

    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
  })
})
