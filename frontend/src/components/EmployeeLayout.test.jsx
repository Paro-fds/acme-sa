import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getProfile } from '../api/employee.js'
import { setDesktop } from '../lib/testViewport.js'
import Avatar from './Avatar.jsx'
import Page from './Page.jsx'

vi.mock('../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../api/auth.js', () => ({ logout: vi.fn(), adminLogout: vi.fn() }))

const PROFILE = { first_name: 'Jean', last_name: 'JOSEPH', position: 'Agent de crédit', photo_url: null }

function renderPage(props = {}, path = '/accueil') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Page account title="Accueil" {...props}>
        <p>Contenu principal</p>
      </Page>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getProfile.mockResolvedValue(PROFILE)
})

afterEach(() => setDesktop(false))

describe('US-113 — Avatar : photo officielle, sinon initiales', () => {
  it('CA-02 : sans photo, les initiales à la même place', () => {
    render(<Avatar firstName="Jean" lastName="JOSEPH" size="lg" />)
    expect(screen.getByText('JJ')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('CA-02 : avec photo, l’image, et les initiales si elle ne charge pas', () => {
    render(<Avatar firstName="Jean" lastName="JOSEPH" photoUrl="/photos/AC-1001.jpg" />)
    const photo = screen.getByRole('img', { name: 'Photo de Jean JOSEPH' })
    expect(photo).toHaveAttribute('src', '/photos/AC-1001.jpg')

    fireEvent.error(photo)
    expect(screen.getByText('JJ')).toBeInTheDocument()
  })
})

describe('US-113 — cadre de l’espace employé', () => {
  it('CA-03 : sur téléphone, la barre du bas dit « Mon dossier » et un bouton ouvre le menu complet', async () => {
    const user = userEvent.setup()
    renderPage()

    const bottom = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(bottom).getByRole('link', { name: /Mon dossier/ })).toHaveAttribute('href', '/profil')
    expect(within(bottom).queryByRole('link', { name: /Mon profil/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))
    const drawer = screen.getByRole('dialog', { name: 'Menu' })
    for (const label of ['Accueil', 'Mon dossier', 'Mes certificats', 'Ma carrière']) {
      expect(within(drawer).getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
    }
    expect(within(drawer).queryByRole('link', { name: /Mon parcours/ })).not.toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument()
    expect(await within(drawer).findByText('Jean JOSEPH')).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'Fermer le menu' }))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('CA-01 : sur ordinateur, le menu à gauche avec Ma carrière, le nom et le poste, sans barre du bas', async () => {
    setDesktop(true)
    renderPage({}, '/accueil')

    const side = screen.getByRole('navigation', { name: 'Espace employé' })
    expect(within(side).getByRole('link', { name: /Accueil/ })).toHaveAttribute('aria-current', 'page')
    expect(within(side).getByRole('link', { name: /Ma carrière/ })).toHaveAttribute('href', '/carriere')
    expect(within(side).queryByRole('link', { name: /Mon parcours/ })).not.toBeInTheDocument()
    expect(await screen.findByText('Jean JOSEPH')).toBeInTheDocument()
    expect(screen.getByText('Agent de crédit')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ouvrir le menu' })).not.toBeInTheDocument()
  })

  it('CA-01 : sur ordinateur, la colonne de droite reçoit l’aide de la page', () => {
    setDesktop(true)
    renderPage({ aside: <p>Aide de la page</p> })

    expect(screen.getByRole('complementary', { name: 'Aide et progression' })).toHaveTextContent('Aide de la page')
  })

  it('le cadre s’affiche même si le profil ne charge pas', async () => {
    getProfile.mockRejectedValue(new Error('hors ligne'))
    renderPage()

    expect(screen.getByText('Contenu principal')).toBeInTheDocument()
    await waitFor(() => expect(getProfile).toHaveBeenCalled())
  })
})
