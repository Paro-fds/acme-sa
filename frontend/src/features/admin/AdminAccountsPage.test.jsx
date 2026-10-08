import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AdminAccountsPage from './AdminAccountsPage.jsx'
import { addAdmin, deleteAdmin, listAdmins } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'
import { resetAdminMfa } from '../../api/mfa.js'

vi.mock('../../api/admin.js', () => ({ addAdmin: vi.fn(), deleteAdmin: vi.fn(), listAdmins: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))
vi.mock('../../api/mfa.js', () => ({ resetAdminMfa: vi.fn() }))

const ME = {
  id: 'a1',
  username: 'admin',
  created_at: '2026-10-01T08:00:00Z',
  created_by: null,
  last_login_at: '2026-10-05T09:15:00Z',
  must_change_password: false,
  is_me: true,
}
const MARIE = {
  id: 'a2',
  username: 'marie.pierre',
  created_at: '2026-10-05T10:00:00Z',
  created_by: 'admin',
  last_login_at: null,
  must_change_password: true,
  is_me: false,
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/administrateurs']}>
      <Routes>
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin/mot-de-passe" element={<p>Choix du mot de passe</p>} />
        <Route path="/admin/administrateurs" element={<AdminAccountsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const items = async () => within(await screen.findByRole('list', { name: 'Comptes administrateurs' })).getAllByRole('listitem')

describe('AdminAccountsPage (US-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAdmins.mockResolvedValue([ME, MARIE])
  })

  it('CA-04 : chaque compte avec sa date de création et sa dernière connexion ; le sien marqué « Vous »', async () => {
    renderPage()

    const [me, marie] = await items()
    expect(screen.getByRole('heading', { name: '2 comptes' })).toBeInTheDocument()
    expect(within(me).getByText('admin')).toBeInTheDocument()
    expect(within(me).getByText('Vous')).toBeInTheDocument()
    expect(within(me).getByText('Ajouté le 01/10/2026')).toBeInTheDocument()
    expect(within(me).getByText(/^Dernière connexion le 05\/10\/2026 à \d\d:\d\d$/)).toBeInTheDocument()
    expect(within(marie).getByText('Ajouté le 05/10/2026 par admin')).toBeInTheDocument()
    expect(within(marie).getByText('Jamais connecté')).toBeInTheDocument()
    expect(within(marie).getByText('Mot de passe provisoire')).toBeInTheDocument()
  })

  it('CA-10 : pas de bouton « Supprimer » sur son propre compte, ni sur le dernier administrateur', async () => {
    renderPage()
    const [me, marie] = await items()

    expect(within(me).queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
    expect(within(marie).getByRole('button', { name: 'Supprimer marie.pierre' })).toBeInTheDocument()
  })

  it('CA-10 : un seul administrateur → aucun bouton « Supprimer »', async () => {
    listAdmins.mockResolvedValue([ME])
    renderPage()
    await items()

    expect(screen.queryByRole('button', { name: /^Supprimer/ })).not.toBeInTheDocument()
  })

  it('CA-05 : ajout → message, formulaire vidé, liste rechargée', async () => {
    addAdmin.mockResolvedValue(MARIE)
    listAdmins.mockResolvedValueOnce([ME]).mockResolvedValue([ME, MARIE])
    const user = userEvent.setup()
    renderPage()
    await items()
    const submit = screen.getByRole('button', { name: "Ajouter l'administrateur" })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Identifiant'), ' marie.pierre ')
    await user.type(screen.getByLabelText('Mot de passe provisoire'), 'Provisoire-2026!')
    await user.click(submit)

    expect(addAdmin).toHaveBeenCalledWith('marie.pierre', 'Provisoire-2026!')
    expect(await screen.findByText(/Administrateur « marie\.pierre » ajouté/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '2 comptes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Identifiant')).toHaveValue('')
    expect(screen.getByLabelText('Mot de passe provisoire')).toHaveValue('')
  })

  it('CA-06 : identifiant déjà pris → message sous le champ', async () => {
    addAdmin.mockRejectedValue(new ApiError(409, 'USERNAME_TAKEN', 'Cet identifiant est déjà utilisé.', 'username'))
    const user = userEvent.setup()
    renderPage()
    await items()

    await user.type(screen.getByLabelText('Identifiant'), 'Admin')
    await user.type(screen.getByLabelText('Mot de passe provisoire'), 'Provisoire-2026!')
    await user.click(screen.getByRole('button', { name: "Ajouter l'administrateur" }))

    const field = screen.getByLabelText('Identifiant')
    expect(await screen.findByText('Cet identifiant est déjà utilisé.')).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/Cet identifiant est déjà utilisé\./)
    expect(field).toHaveValue('Admin')
  })

  it('CA-06 : mot de passe trop court → message sous le champ', async () => {
    addAdmin.mockRejectedValue(new ApiError(422, 'PASSWORD_TOO_SHORT', 'Le mot de passe doit contenir au moins 12 caractères.', 'password'))
    const user = userEvent.setup()
    renderPage()
    await items()

    await user.type(screen.getByLabelText('Identifiant'), 'marie.pierre')
    await user.type(screen.getByLabelText('Mot de passe provisoire'), 'court')
    await user.click(screen.getByRole('button', { name: "Ajouter l'administrateur" }))

    expect(await screen.findByText('Le mot de passe doit contenir au moins 12 caractères.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe provisoire')).toHaveAttribute('aria-invalid', 'true')
  })

  it('CA-09 : suppression après confirmation', async () => {
    deleteAdmin.mockResolvedValue(null)
    listAdmins.mockResolvedValueOnce([ME, MARIE]).mockResolvedValue([ME])
    const user = userEvent.setup()
    renderPage()
    const [, marie] = await items()

    await user.click(within(marie).getByRole('button', { name: 'Supprimer marie.pierre' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer le compte de marie.pierre\u00a0?' })
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    expect(deleteAdmin).toHaveBeenCalledWith('a2')
    expect(await screen.findByText('Compte « marie.pierre » supprimé.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '1 compte' })).toBeInTheDocument()
  })

  it('CA-09 : « Annuler » ne supprime rien', async () => {
    const user = userEvent.setup()
    renderPage()
    const [, marie] = await items()

    await user.click(within(marie).getByRole('button', { name: 'Supprimer marie.pierre' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(deleteAdmin).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(within(marie).getByRole('button', { name: 'Supprimer marie.pierre' })).toHaveFocus())
  })

  it('mot de passe provisoire non changé → écran de choix du mot de passe', async () => {
    listAdmins.mockRejectedValue(new ApiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Choisissez votre mot de passe pour continuer.'))
    renderPage()

    expect(await screen.findByText('Choix du mot de passe')).toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    listAdmins.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})

describe('AdminAccountsPage — double authentification (US-102 CA-05)', () => {
  const PAUL = { ...MARIE, id: 'a3', username: 'paul.louis', must_change_password: false, mfa_method: 'WHATSAPP' }

  beforeEach(() => {
    vi.clearAllMocks()
    listAdmins.mockResolvedValue([{ ...ME, mfa_method: 'TOTP' }, MARIE, PAUL])
  })

  it('chaque compte indique sa méthode, ou qu’elle reste à choisir', async () => {
    renderPage()

    const [me, marie, paul] = await items()
    expect(within(me).getByText(/Application d'authentification/)).toBeInTheDocument()
    expect(within(marie).getByText(/à choisir à la prochaine connexion/)).toBeInTheDocument()
    expect(within(paul).getByText(/WhatsApp/)).toBeInTheDocument()
    expect(within(me).queryByRole('button', { name: /Réinitialiser/ })).not.toBeInTheDocument()
    expect(within(marie).queryByRole('button', { name: /Réinitialiser/ })).not.toBeInTheDocument()
  })

  it('téléphone perdu : un autre compte RH réinitialise, après confirmation', async () => {
    resetAdminMfa.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage()

    const paul = (await items())[2]
    await user.click(within(paul).getByRole('button', { name: 'Réinitialiser la double authentification de paul.louis' }))
    expect(within(paul).getByRole('alertdialog')).toHaveTextContent('il choisira une nouvelle méthode')
    await user.click(within(paul).getByRole('button', { name: 'Réinitialiser' }))

    expect(resetAdminMfa).toHaveBeenCalledWith('a3')
    expect(await screen.findByText('Double authentification de « paul.louis » réinitialisée.')).toBeInTheDocument()
  })
})

