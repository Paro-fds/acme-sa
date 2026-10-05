import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ResetAccess, { RESET_DONE } from './ResetAccess.jsx'
import { resetAccess } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({ resetAccess: vi.fn() }))

function renderBlock({ activated = true, onReset = vi.fn() } = {}) {
  const view = (props) => (
    <MemoryRouter initialEntries={['/admin/employes/1001']}>
      <Routes>
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route
          path="/admin/employes/:id"
          element={<ResetAccess employeeId="1001" name="JOSEPH Jean" onReset={onReset} {...props} />}
        />
      </Routes>
    </MemoryRouter>
  )
  const result = render(view({ activated }))
  return { ...result, onReset, rerenderWith: (props) => result.rerender(view(props)) }
}

const block = () => screen.getByRole('region', { name: 'Accès' })
const resetButton = () => screen.queryByRole('button', { name: "Réinitialiser l'accès" })

describe('ResetAccess (US-22)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAccess.mockResolvedValue(undefined)
  })

  it('CA-01 : bouton, confirmation, puis réinitialisation et message', async () => {
    const user = userEvent.setup()
    const { onReset, rerenderWith } = renderBlock()
    expect(within(block()).getByText('Compte activé')).toBeInTheDocument()

    await user.click(resetButton())
    const dialog = screen.getByRole('alertdialog', { name: "Réinitialiser l'accès de JOSEPH Jean ?" })
    expect(dialog).toHaveAccessibleDescription(/dossier et ses documents sont conservés/)
    expect(resetAccess).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Réinitialiser' }))

    expect(resetAccess).toHaveBeenCalledWith('1001')
    expect(await screen.findByText(RESET_DONE)).toBeInTheDocument()
    expect(RESET_DONE).toBe("Accès réinitialisé. L'employé pourra créer un nouveau mot de passe à sa prochaine connexion.")
    expect(onReset).toHaveBeenCalledOnce()

    // Le dossier rechargé indique « Compte non activé » ; le message reste affiché.
    rerenderWith({ activated: false })
    expect(within(block()).getByText('Compte non activé')).toBeInTheDocument()
    expect(screen.getByText(RESET_DONE)).toBeInTheDocument()
    expect(resetButton()).not.toBeInTheDocument()
  })

  it('CA-06 : compte non activé → pas de bouton', () => {
    renderBlock({ activated: false })

    expect(within(block()).getByText('Compte non activé')).toBeInTheDocument()
    expect(resetButton()).not.toBeInTheDocument()
  })

  it('CA-07 : « Annuler » ne modifie rien et rend le focus au bouton', async () => {
    const user = userEvent.setup()
    const { onReset } = renderBlock()

    await user.click(resetButton())
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(resetAccess).not.toHaveBeenCalled()
    expect(onReset).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(resetButton()).toHaveFocus())
  })

  it('CA-07 : Échap ferme la confirmation sans rien modifier', async () => {
    const user = userEvent.setup()
    renderBlock()

    await user.click(resetButton())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(resetAccess).not.toHaveBeenCalled()
  })

  it('pendant l’envoi, les boutons sont désactivés (pas de double envoi)', async () => {
    let finish
    resetAccess.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderBlock()

    await user.click(resetButton())
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(screen.getByRole('button', { name: 'Réinitialisation…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    finish()
    expect(await screen.findByText(RESET_DONE)).toBeInTheDocument()
    expect(resetAccess).toHaveBeenCalledOnce()
  })

  it('erreur 409 (déjà réinitialisé ailleurs) → message et dossier rechargé', async () => {
    resetAccess.mockRejectedValue(new ApiError(409, 'ACCOUNT_NOT_ACTIVATED', "Cet employé n'a pas encore créé de mot de passe."))
    const user = userEvent.setup()
    const { onReset } = renderBlock()

    await user.click(resetButton())
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Cet employé n'a pas encore créé de mot de passe.")
    expect(screen.queryByText(RESET_DONE)).not.toBeInTheDocument()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('session admin expirée → connexion admin', async () => {
    resetAccess.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Session expirée.'))
    const user = userEvent.setup()
    renderBlock()

    await user.click(resetButton())
    await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
