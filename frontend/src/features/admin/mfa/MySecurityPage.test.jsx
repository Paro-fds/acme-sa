import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { myMfa } from '../../../api/mfa.js'
import MySecurityPage from './MySecurityPage.jsx'

vi.mock('../../../api/mfa.js', () => ({
  myMfa: { status: vi.fn(), sendCode: vi.fn(), confirmCurrent: vi.fn(), start: vi.fn(), confirm: vi.fn() },
}))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const SENT = { method: 'WHATSAPP', destination: '+509 •••• 1111', local_code: '482913' }

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/securite']}>
      <Routes>
        <Route path="/admin/securite" element={<MySecurityPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  myMfa.status.mockResolvedValue({ enrolled: true, method: 'WHATSAPP', destination: '+509 •••• 1111' })
})

describe('MySecurityPage (US-102 CA-04)', () => {
  it('affiche la méthode actuelle', async () => {
    renderPage()

    expect(await screen.findByText('WhatsApp · +509 •••• 1111')).toBeInTheDocument()
  })

  it('changer de méthode : confirmation avec l’actuelle, puis la nouvelle', async () => {
    myMfa.sendCode.mockResolvedValue(SENT)
    myMfa.confirmCurrent.mockResolvedValue(null)
    myMfa.start.mockResolvedValue({ method: 'EMAIL', code: { ...SENT, method: 'EMAIL', destination: 'r•••@exemple.test', local_code: '777888' }, totp: null })
    myMfa.confirm.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Changer de méthode' }))
    await user.click(screen.getByRole('button', { name: 'Recevoir un code par WhatsApp' }))
    await user.type(await screen.findByLabelText('Code de vérification'), '482913')
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(myMfa.confirmCurrent).toHaveBeenCalledWith('482913')

    await user.click(await screen.findByRole('radio', { name: /Email/ }))
    await user.type(screen.getByLabelText('Adresse email'), 'rh@exemple.test')
    await user.click(screen.getByRole('button', { name: 'Recevoir un code' }))
    await user.type(await screen.findByLabelText('Code de vérification'), '777888')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la nouvelle méthode' }))

    expect(myMfa.confirm).toHaveBeenCalledWith('777888')
    expect(await screen.findByText(/Nouvelle méthode enregistrée/)).toBeInTheDocument()
    expect(myMfa.status).toHaveBeenCalledTimes(2)
  })

  it('« Annuler » revient à la méthode actuelle sans rien changer', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Changer de méthode' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: 'Changer de méthode' })).toBeInTheDocument()
    expect(myMfa.sendCode).not.toHaveBeenCalled()
  })
})
