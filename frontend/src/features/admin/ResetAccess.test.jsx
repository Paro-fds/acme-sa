import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ResetAccess, { RESET_DONE } from './ResetAccess.jsx'
import { liftHold, resetAccess } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({ resetAccess: vi.fn(), liftHold: vi.fn() }))

function renderBlock({ activated = true, locked = false, held = false, onReset = vi.fn() } = {}) {
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
  const result = render(view({ activated, locked, held }))
  return { ...result, onReset, rerenderWith: (props) => result.rerender(view(props)) }
}

const block = () => screen.getByRole('region', { name: 'Accès' })
const unlockButton = () => screen.queryByRole('button', { name: "Débloquer l'accès" })

describe('ResetAccess (US-22, « Débloquer l’accès » depuis US-1003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAccess.mockResolvedValue(undefined)
  })

  it('US-1003 CA-08 : accès verrouillé, confirmation, déblocage et message', async () => {
    const user = userEvent.setup()
    const { onReset, rerenderWith } = renderBlock({ locked: true })
    expect(within(block()).getByText('Déjà connecté')).toBeInTheDocument()
    expect(within(block()).getByText('Accès verrouillé après plusieurs échecs')).toBeInTheDocument()

    await user.click(unlockButton())
    const dialog = screen.getByRole('alertdialog', { name: "Débloquer l'accès de JOSEPH Jean ?" })
    expect(dialog).toHaveAccessibleDescription(/dossier et ses documents sont conservés/)
    expect(resetAccess).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Débloquer' }))

    expect(resetAccess).toHaveBeenCalledWith('1001')
    expect(await screen.findByText(RESET_DONE)).toBeInTheDocument()
    expect(RESET_DONE).toBe("Accès débloqué. L'employé peut se reconnecter avec un code reçu par courriel.")
    expect(onReset).toHaveBeenCalledOnce()

    // Le dossier rechargé n'est plus verrouillé ; le message reste affiché.
    rerenderWith({ activated: true, locked: false })
    expect(within(block()).queryByText('Accès verrouillé après plusieurs échecs')).not.toBeInTheDocument()
    expect(screen.getByText(RESET_DONE)).toBeInTheDocument()
  })

  it('jamais connecté et pas verrouillé → rien à débloquer, pas de bouton', () => {
    renderBlock({ activated: false, locked: false })

    expect(within(block()).getByText('Jamais connecté')).toBeInTheDocument()
    expect(unlockButton()).not.toBeInTheDocument()
  })

  it('jamais connecté mais verrouillé → bouton', () => {
    renderBlock({ activated: false, locked: true })

    expect(unlockButton()).toBeInTheDocument()
  })

  it('CA-07 : « Annuler » ne modifie rien et rend le focus au bouton', async () => {
    const user = userEvent.setup()
    const { onReset } = renderBlock()

    await user.click(unlockButton())
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(resetAccess).not.toHaveBeenCalled()
    expect(onReset).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(unlockButton()).toHaveFocus())
  })

  it('CA-07 : Échap ferme la confirmation sans rien modifier', async () => {
    const user = userEvent.setup()
    renderBlock()

    await user.click(unlockButton())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(resetAccess).not.toHaveBeenCalled()
  })

  it('pendant l’envoi, les boutons sont désactivés (pas de double envoi)', async () => {
    let finish
    resetAccess.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderBlock()

    await user.click(unlockButton())
    await user.click(screen.getByRole('button', { name: 'Débloquer' }))

    expect(screen.getByRole('button', { name: 'Déblocage…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    finish()
    expect(await screen.findByText(RESET_DONE)).toBeInTheDocument()
    expect(resetAccess).toHaveBeenCalledOnce()
  })

  it('erreur du serveur → message et dossier rechargé', async () => {
    resetAccess.mockRejectedValue(new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employé introuvable.'))
    const user = userEvent.setup()
    const { onReset } = renderBlock()

    await user.click(unlockButton())
    await user.click(screen.getByRole('button', { name: 'Débloquer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Employé introuvable.')
    expect(screen.queryByText(RESET_DONE)).not.toBeInTheDocument()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('session admin expirée → connexion admin', async () => {
    resetAccess.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Session expirée.'))
    const user = userEvent.setup()
    renderBlock()

    await user.click(unlockButton())
    await user.click(screen.getByRole('button', { name: 'Débloquer' }))

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})

describe('US-1026 — lever le gel de 72 heures (D-64)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    liftHold.mockResolvedValue({ message: "Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier." })
  })

  it('CA-01 : sans gel, rien ne s’affiche', () => {
    renderBlock()

    expect(screen.queryByText(/Gel de 72 heures en cours/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lever le gel' })).not.toBeInTheDocument()
  })

  it('CA-01, CA-03 : gel en cours, confirmation, levée et message du serveur', async () => {
    const user = userEvent.setup()
    const { onReset } = renderBlock({ held: true })
    expect(within(block()).getByText('Gel de 72 heures en cours : contact changé récemment')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lever le gel' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Lever le gel de JOSEPH Jean\u00a0?' })
    await user.click(within(dialog).getByRole('button', { name: 'Lever le gel' }))

    expect(liftHold).toHaveBeenCalledWith('1001')
    expect(
      await screen.findByText("Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier."),
    ).toBeVisible()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('CA-02 : « Annuler » ne lève rien', async () => {
    const user = userEvent.setup()
    renderBlock({ held: true })

    await user.click(screen.getByRole('button', { name: 'Lever le gel' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(liftHold).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Lever le gel' })).toHaveFocus()
  })

  it('CA-02 : refus du serveur affiché', async () => {
    liftHold.mockRejectedValue(new ApiError(409, 'NO_CONTACT_HOLD', 'Aucun gel en cours pour ce code.'))
    const user = userEvent.setup()
    renderBlock({ held: true })

    await user.click(screen.getByRole('button', { name: 'Lever le gel' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Lever le gel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun gel en cours pour ce code.')
  })
})
