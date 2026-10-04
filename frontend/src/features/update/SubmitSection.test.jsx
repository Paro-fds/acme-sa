import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ConfirmationCheckbox, SubmitButton, useSubmission } from './SubmitSection.jsx'
import { submitUpdate } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/employee.js', () => ({ submitUpdate: vi.fn() }))

function Harness() {
  const submission = useSubmission()
  return (
    <>
      <ConfirmationCheckbox checked={submission.confirmed} onChange={submission.setConfirmed} />
      <SubmitButton onClick={submission.submit} disabled={!submission.confirmed || submission.sending} />
      {submission.error && <p role="alert">{submission.error}</p>}
    </>
  )
}

function renderSection() {
  render(
    <MemoryRouter initialEntries={['/mise-a-jour/verification']}>
      <Routes>
        <Route path="/" element={<p>Écran identification</p>} />
        <Route path="/mise-a-jour/verification" element={<Harness />} />
        <Route path="/mise-a-jour/confirmation" element={<p>Écran confirmation</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const checkbox = () => screen.getByRole('checkbox', { name: /Je confirme que les informations fournies sont exactes et sincères\./ })
const button = () => screen.getByRole('button', { name: 'Soumettre ma mise à jour' })

describe('SubmitSection (US-12)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-01 : le bouton reste inactif tant que la case n’est pas cochée', async () => {
    renderSection()
    const user = userEvent.setup()

    expect(checkbox()).not.toBeChecked()
    expect(button()).toBeDisabled()
    await user.click(checkbox())
    expect(button()).toBeEnabled()
    await user.click(checkbox())
    expect(button()).toBeDisabled()
  })

  it('CA-02 : la soumission envoie la confirmation et ouvre l’écran de confirmation', async () => {
    submitUpdate.mockResolvedValue({ state: 'DONE', submitted_at: '2026-10-04T15:10:00' })
    renderSection()
    const user = userEvent.setup()

    await user.click(checkbox())
    await user.click(button())

    expect(submitUpdate).toHaveBeenCalledWith(true)
    expect(await screen.findByText('Écran confirmation')).toBeInTheDocument()
  })

  it('CA-06 : un double clic n’envoie qu’une seule soumission', async () => {
    let resolve
    submitUpdate.mockReturnValue(new Promise((done) => (resolve = done)))
    renderSection()
    const user = userEvent.setup()
    await user.click(checkbox())

    await user.dblClick(button())

    expect(button()).toBeDisabled()
    expect(submitUpdate).toHaveBeenCalledOnce()
    resolve({ state: 'DONE' })
    expect(await screen.findByText('Écran confirmation')).toBeInTheDocument()
  })

  it('CA-06 : « déjà soumise » (deuxième envoi) affiche normalement la confirmation', async () => {
    submitUpdate.mockRejectedValue(
      new ApiError(409, 'UPDATE_ALREADY_SUBMITTED', 'Votre mise à jour a déjà été soumise : elle ne peut plus être modifiée.'),
    )
    renderSection()
    const user = userEvent.setup()

    await user.click(checkbox())
    await user.click(button())

    expect(await screen.findByText('Écran confirmation')).toBeInTheDocument()
  })

  it('une erreur réseau est affichée et le bouton redevient utilisable', async () => {
    submitUpdate.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable. Vérifiez votre connexion.'))
    renderSection()
    const user = userEvent.setup()

    await user.click(checkbox())
    await user.click(button())

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur est injoignable.')
    expect(button()).toBeEnabled()
  })

  it('une session expirée renvoie à l’identification', async () => {
    submitUpdate.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.'))
    renderSection()
    const user = userEvent.setup()

    await user.click(checkbox())
    await user.click(button())

    expect(await screen.findByText('Écran identification')).toBeInTheDocument()
  })
})
