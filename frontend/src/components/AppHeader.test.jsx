import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import AppHeader from './AppHeader.jsx'
import { logout } from '../api/auth.js'
import { ApiError } from '../api/client.js'
import { useLoader } from '../lib/useLoader.js'

vi.mock('../api/auth.js', () => ({ logout: vi.fn() }))

const loadProfile = vi.fn()

function IdentifyProbe() {
  const { state } = useLocation()
  return <p>Écran identification : {state?.notice ?? state?.message}</p>
}

function ProfileProbe() {
  const { data } = useLoader(loadProfile)
  return (
    <>
      <AppHeader title="Mon profil" account />
      {data && <p>Dossier de {data}</p>}
    </>
  )
}

function renderAt(entries) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <IdentifyProbe /> },
      { path: '/profil', element: <ProfileProbe /> },
      { path: '/mise-a-jour', element: <AppHeader title="Mise à jour" account /> },
    ],
    { initialEntries: entries, initialIndex: entries.length - 1 },
  )
  render(<RouterProvider router={router} />)
  return router
}

const openMenu = (user) => user.click(screen.getByRole('button', { name: 'Menu du compte' }))

describe('AppHeader — menu de l’avatar (US-04)', () => {
  beforeEach(() => {
    loadProfile.mockResolvedValue('JOSEPH Jean')
  })

  it('le menu est fermé par défaut et s’ouvre au clic sur l’avatar', async () => {
    const user = userEvent.setup()
    renderAt(['/mise-a-jour'])

    const avatar = screen.getByRole('button', { name: 'Menu du compte' })
    expect(avatar).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitem', { name: 'Se déconnecter' })).not.toBeInTheDocument()

    await openMenu(user)

    expect(avatar).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('Échap referme le menu', async () => {
    const user = userEvent.setup()
    renderAt(['/mise-a-jour'])

    await openMenu(user)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('CA-01 : « Se déconnecter » ferme la session et revient à l’identification avec le message', async () => {
    logout.mockResolvedValue(null)
    const user = userEvent.setup()
    renderAt(['/mise-a-jour'])

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))

    expect(logout).toHaveBeenCalledOnce()
    expect(await screen.findByText('Écran identification : Vous êtes déconnecté.')).toBeInTheDocument()
  })

  it('CA-01 : une session déjà expirée mène aussi à l’identification', async () => {
    logout.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.'))
    const user = userEvent.setup()
    renderAt(['/mise-a-jour'])

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))

    expect(await screen.findByText('Écran identification : Vous êtes déconnecté.')).toBeInTheDocument()
  })

  it('si le serveur ne répond pas, l’employé reste sur l’écran et voit l’erreur', async () => {
    logout.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur.'))
    const user = userEvent.setup()
    renderAt(['/mise-a-jour'])

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur.')
    expect(screen.queryByText(/Écran identification/)).not.toBeInTheDocument()
  })

  it('CA-03 : après déconnexion, le retour arrière n’affiche aucune donnée du dossier', async () => {
    logout.mockResolvedValue(null)
    const user = userEvent.setup()
    const router = renderAt(['/profil', '/mise-a-jour'])

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    await screen.findByText('Écran identification : Vous êtes déconnecté.')

    // Le serveur refuse désormais l'accès : le retour arrière recharge le profil et échoue.
    loadProfile.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    await act(() => router.navigate(-1))

    expect(await screen.findByText('Écran identification : Vous devez être connecté.')).toBeInTheDocument()
    expect(screen.queryByText(/Dossier de/)).not.toBeInTheDocument()
  })

  it('sans prop account, aucun menu n’est affiché (écrans publics)', () => {
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <AppHeader title="Identification" /> }])} />,
    )

    expect(screen.queryByRole('button', { name: 'Menu du compte' })).not.toBeInTheDocument()
  })
})

describe('AppHeader — logo', () => {
  it("affiche le logo de l'entreprise, avec son nom pour les lecteurs d'écran", () => {
    const router = createMemoryRouter([{ path: '/', element: <AppHeader title="Mon profil" /> }])
    render(<RouterProvider router={router} />)

    const logo = screen.getByRole('img', { name: 'ACME SA' })
    expect(logo).toHaveAttribute('src', expect.stringContaining('logo-acme'))
    expect(screen.getByRole('heading', { name: 'Mon profil' })).toBeInTheDocument()
  })
})

describe('AppHeader — menu du compte admin (US-23)', () => {
  function renderHeader(account) {
    const router = createMemoryRouter([
      { path: '/', element: <AppHeader title="Tableau de bord" account={account} /> },
      { path: '/admin/administrateurs', element: <p>Écran administrateurs</p> },
      { path: '/admin/mot-de-passe', element: <p>Écran mot de passe</p> },
    ])
    render(<RouterProvider router={router} />)
  }

  it('propose « Administrateurs » et « Changer mon mot de passe »', async () => {
    const user = userEvent.setup()
    renderHeader('admin')

    await user.click(screen.getByRole('button', { name: 'Menu du compte' }))
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(items).toEqual(['manage_accountsAdministrateurs', 'passwordChanger mon mot de passe', 'logoutSe déconnecter'])

    await user.click(screen.getByRole('menuitem', { name: 'Administrateurs' }))
    expect(await screen.findByText('Écran administrateurs')).toBeInTheDocument()
  })

  it('le menu employé ne contient que « Se déconnecter »', async () => {
    const user = userEvent.setup()
    renderHeader(true)

    await user.click(screen.getByRole('button', { name: 'Menu du compte' }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
    expect(screen.queryByRole('menuitem', { name: 'Administrateurs' })).not.toBeInTheDocument()
  })
})
