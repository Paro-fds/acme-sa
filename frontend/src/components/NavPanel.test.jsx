import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminFrame } from '../api/adminFrame.js'
import { getProfile } from '../api/employee.js'
import AdminLayout from '../features/admin/AdminLayout.jsx'
import { setDesktop } from '../lib/testViewport.js'
import Page from './Page.jsx'

vi.mock('../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../api/adminFrame.js', () => ({ getAdminFrame: vi.fn() }))
vi.mock('../api/auth.js', () => ({ logout: vi.fn(), adminLogout: vi.fn() }))

const PROFILE = { first_name: 'Jean', last_name: 'JOSEPH', position: 'Agent de crédit', photo_url: null }
const FRAME = {
  me: { display_name: 'Marie LAFORTUNE', role: 'AGENT_RH', role_label: 'Agent RH' },
  counts: { validation: 18, reports: 6, to_attach: 0 },
}
const MOTTO = /Grandir ensemble\s*pour un impact durable/

function renderEmployee() {
  return render(
    <MemoryRouter initialEntries={['/accueil']}>
      <Page account title="Accueil">
        <p>Contenu</p>
      </Page>
    </MemoryRouter>,
  )
}

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={['/admin/validation']}>
      <AdminLayout title="File de validation">
        <p>Contenu</p>
      </AdminLayout>
    </MemoryRouter>,
  )
}

const panelOf = (nav) => nav.closest('[data-nav-panel]')

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 19, 10, 0))
  getProfile.mockResolvedValue(PROFILE)
  getAdminFrame.mockResolvedValue(FRAME)
})

afterEach(() => {
  vi.useRealTimers()
  setDesktop(false)
})

describe('US-127 — espace employé sur ordinateur', () => {
  it('CA-01 : panneau bleu à gauche : marque, rubriques avec icône, « Se déconnecter », montagnes et devise', async () => {
    setDesktop(true)
    renderEmployee()
    const panel = panelOf(screen.getByRole('navigation', { name: 'Espace employé' }))
    expect(panel).toHaveClass('bg-nav-bg')
    expect(panel).toHaveTextContent('ACME SA')
    expect(panel).toHaveTextContent('Microfinance, un avenir ensemble')
    const accueil = within(panel).getByRole('link', { name: /Accueil/ })
    expect(accueil).toHaveAttribute('aria-current', 'page')
    expect(accueil.querySelector('.material-symbols-outlined')).toHaveTextContent('home')
    expect(within(panel).getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument()
    expect(within(panel).getByText(MOTTO)).toBeInTheDocument()
  })

  it('CA-02 : le panneau reste en place quand la page défile, et défile seul s’il est trop haut', () => {
    setDesktop(true)
    renderEmployee()
    expect(panelOf(screen.getByRole('navigation', { name: 'Espace employé' }))).toHaveClass('sticky', 'top-0', 'h-dvh', 'overflow-y-auto')
  })

  it('CA-03 : barre du haut : date du jour, cloche, nom et poste, menu du compte', async () => {
    setDesktop(true)
    renderEmployee()
    const bar = screen.getByRole('banner')
    expect(bar).toHaveTextContent('Lundi 19 octobre 2026')
    expect(within(bar).getByRole('button', { name: /Notifications/ })).toBeInTheDocument()
    expect(await within(bar).findByText('Jean JOSEPH')).toBeInTheDocument()
    expect(within(bar).getByText('Agent de crédit')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Menu du compte' })).toBeInTheDocument()
  })

  it('CA-04 : sur téléphone, le cadre employé ne change pas (en-tête, bouton du menu, barre du bas)', () => {
    renderEmployee()
    expect(screen.queryByRole('navigation', { name: 'Espace employé' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
  })
})

describe('US-127 — espace de gestion', () => {
  it('CA-01 : panneau bleu : « Espace de gestion », rubriques avec compteurs, « Se déconnecter », montagnes', async () => {
    renderAdmin()
    const panel = panelOf(screen.getByRole('navigation', { name: 'Menu principal RH' }))
    expect(panel).toHaveClass('bg-nav-bg')
    expect(panel).toHaveTextContent('Espace de gestion')
    const dashboard = await within(panel).findByRole('link', { name: 'Tableau de bord' })
    expect(dashboard.querySelector('.material-symbols-outlined')).toHaveTextContent('dashboard')
    expect(within(panel).getByRole('link', { name: /File de validation\s*18$/ })).toHaveAttribute('aria-current', 'page')
    expect(within(panel).getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument()
    expect(within(panel).getByText(MOTTO)).toBeInTheDocument()
  })

  it('CA-02 : sur ordinateur, le panneau reste en place quand la page défile', () => {
    renderAdmin()
    expect(panelOf(screen.getByRole('navigation', { name: 'Menu principal RH' }))).toHaveClass('lg:sticky', 'lg:top-0', 'lg:h-dvh', 'overflow-y-auto')
  })

  it('CA-03 : barre du haut blanche : date du jour, nom et rôle, menu du compte', async () => {
    renderAdmin()
    const bar = screen.getByRole('banner')
    expect(bar).toHaveClass('bg-surface')
    expect(bar).toHaveTextContent('Lundi 19 octobre 2026')
    expect(await within(bar).findByText('Marie LAFORTUNE')).toBeInTheDocument()
    expect(within(bar).getByText('Agent RH')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Menu du compte' })).toBeInTheDocument()
  })

  it('CA-04 : sur téléphone, le bouton du menu de la barre du haut ouvre le panneau bleu', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderAdmin()
    const toggle = within(screen.getByRole('banner')).getByRole('button', { name: 'Menu de navigation RH' })
    const panel = panelOf(screen.getByRole('navigation', { name: 'Menu principal RH' }))
    expect(panel).toHaveClass('-translate-x-full')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveClass('translate-x-0')
  })
})
