import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminFrame } from '../../api/adminFrame.js'
import AdminLayout from './AdminLayout.jsx'

vi.mock('../../api/adminFrame.js', () => ({ getAdminFrame: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn(), adminLogout: vi.fn() }))

const FRAME = {
  me: { display_name: 'Administrateur Démo', role: 'ADMIN', role_label: 'Administrateur' },
  counts: { validation: 27, reports: 9, to_attach: 0 },
}

function renderLayout(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/admin/validation']}>
      <AdminLayout title="File de validation des certificats" subtitle="27 certificats en attente" {...props}>
        <p>Contenu</p>
      </AdminLayout>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getAdminFrame.mockResolvedValue(FRAME)
})

describe('US-108 — cadre de l’espace RH (écran A02)', () => {
  it('CA-01 : en-tête « Espace de gestion » (US-111), nom et rôle du compte, « Se déconnecter »', async () => {
    renderLayout()
    const header = screen.getByRole('banner')
    expect(header).toHaveTextContent('Espace de gestion')
    expect(await within(header).findByText('Administrateur Démo · Administrateur')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('CA-01 : menu des écrans validés, rubrique active, titre de la page dans le contenu', async () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    await screen.findByText('Administrateur Démo · Administrateur')
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent.replace(/\d+$/, ''))
    expect(labels).toEqual([
      'Tableau de bord',
      'File de validation',
      'Employés',
      'Postes ouverts',
      'Signalements',
      'Comptes et rôles',
      "Journal d'audit",
    ])
    expect(within(nav).getByRole('link', { name: /File de validation/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'File de validation des certificats' })).toBeInTheDocument()
    expect(screen.getByText('27 certificats en attente')).toBeInTheDocument()
  })

  it('CA-02 : compteurs réels du menu, aucun compteur à 0', async () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    expect(await within(nav).findByRole('link', { name: /^File de validation\s*27$/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /^Signalements\s*9$/ })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /À rattacher/ })).not.toBeInTheDocument()
  })

  it('CA-02 : sans réponse de l’API, le cadre s’affiche avec les seules rubriques ouvertes à tous', async () => {
    getAdminFrame.mockRejectedValue(new Error('hors ligne'))
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Tableau de bord', 'Employés'])
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })
})

describe('US-108 — menu selon le rôle (cahier des charges §4.3)', () => {
  const menuFor = async (role) => {
    getAdminFrame.mockResolvedValue({ ...FRAME, me: { ...FRAME.me, role } })
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    await screen.findByText(/Administrateur Démo/)
    return within(nav).getAllByRole('link').map((link) => link.textContent.replace(/\d+$/, ''))
  }

  it('Agent RH : ni « À rattacher », ni « Comptes et rôles », ni « Journal d’audit »', async () => {
    expect(await menuFor('AGENT_RH')).toEqual(['Tableau de bord', 'File de validation', 'Employés', 'Postes ouverts', 'Signalements'])
  })

  it('Responsable du référentiel : tableau de bord et employés (« À rattacher » retiré du menu le 2026-10-13)', async () => {
    expect(await menuFor('REFERENTIAL')).toEqual(['Tableau de bord', 'Employés'])
  })

  it('Lecture seule : consultation, sans référentiel, comptes ni journal', async () => {
    expect(await menuFor('READONLY')).toEqual(['Tableau de bord', 'File de validation', 'Employés', 'Postes ouverts', 'Signalements'])
  })

  it('Administrateur : toutes les rubriques', async () => {
    expect(await menuFor('ADMIN')).toHaveLength(7)
  })
})

describe('US-112 — menu du compte selon la double authentification', () => {
  async function accountMenu(mfaRequired) {
    getAdminFrame.mockResolvedValue({ ...FRAME, me: { ...FRAME.me, mfa_required: mfaRequired } })
    const user = userEvent.setup()
    renderLayout()
    await screen.findByText('Administrateur Démo · Administrateur')
    await user.click(screen.getByRole('button', { name: 'Menu du compte' }))
    return screen.getByRole('menu')
  }

  it('coupée : pas de « Ma double authentification »', async () => {
    expect(within(await accountMenu(false)).queryByRole('menuitem', { name: 'Ma double authentification' })).not.toBeInTheDocument()
  })

  it('demandée : pas de lien non plus (retiré du menu le 2026-10-13, page /admin/securite conservée)', async () => {
    expect(within(await accountMenu(true)).queryByRole('menuitem', { name: 'Ma double authentification' })).not.toBeInTheDocument()
  })

  it('Administrateur : ni « Administrateurs » ni « Référentiel », déjà dans le menu de gauche (choix du 2026-10-13)', async () => {
    const items = within(await accountMenu(true)).getAllByRole('menuitem').map((item) => item.textContent)
    expect(items).toEqual(['passwordChanger mon mot de passe', 'logoutSe déconnecter'])
  })
})
