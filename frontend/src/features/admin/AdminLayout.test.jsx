import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminFrame } from '../../api/adminFrame.js'
import AdminLayout from './AdminLayout.jsx'

vi.mock('../../api/adminFrame.js', () => ({ getAdminFrame: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn(), adminLogout: vi.fn() }))

const FRAME = {
  me: { display_name: 'Administrateur Démo', role_label: 'Administrateur' },
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
  it('CA-01 : en-tête « Portail RH », nom et rôle du compte, « Se déconnecter »', async () => {
    renderLayout()
    const header = screen.getByRole('banner')
    expect(header).toHaveTextContent('Portail RH')
    expect(await within(header).findByText('Administrateur Démo · Administrateur')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
  })

  it('CA-01 : menu des écrans validés, rubrique active, titre de la page dans le contenu', async () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent.replace(/\d+$/, ''))
    expect(labels).toEqual([
      'Tableau de bord',
      'File de validation',
      'Employés',
      'Postes ouverts',
      'Signalements',
      'À rattacher',
      'Comptes et rôles',
      "Journal d'audit",
    ])
    expect(within(nav).getByRole('link', { name: /File de validation/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'File de validation des certificats' })).toBeInTheDocument()
    expect(screen.getByText('27 certificats en attente')).toBeInTheDocument()
    await screen.findByText('Administrateur Démo · Administrateur')
  })

  it('CA-02 : compteurs réels du menu, aucun compteur à 0', async () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    expect(await within(nav).findByRole('link', { name: /^File de validation\s*27$/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /^Signalements\s*9$/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'À rattacher' })).toBeInTheDocument()
  })

  it('CA-02 : sans réponse de l’API, le cadre s’affiche sans compteur ni nom', async () => {
    getAdminFrame.mockRejectedValue(new Error('hors ligne'))
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Menu principal RH' })
    expect(within(nav).getByRole('link', { name: 'File de validation' })).toBeInTheDocument()
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })
})
