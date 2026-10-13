import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminFrame } from '../../../api/adminFrame.js'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../../api/notifications.js'
import { setDesktop } from '../../../lib/testViewport.js'
import AdminLayout from '../AdminLayout.jsx'
import NotificationsPage from './NotificationsPage.jsx'
import { formatWhen } from './notificationParts.jsx'

vi.mock('../../../api/adminFrame.js', () => ({ getAdminFrame: vi.fn() }))
vi.mock('../../../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const frame = (role) => ({
  me: { display_name: 'Agent RH Démo 1', role, role_label: 'Agent RH', mfa_required: false },
  counts: { validation: 0, reports: 0, to_attach: 0 },
})

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()

const ITEMS = [
  {
    key: 'certificate:c1',
    kind: 'CERTIFICATE_SUBMITTED',
    kind_label: 'Certificat',
    title: 'Marie PIERRE a déposé un certificat',
    detail: 'Licence en sciences comptables',
    at: minutesAgo(10),
    link: '/admin/validation/c1',
    unread: true,
  },
  {
    key: 'application:3',
    kind: 'APPLICATION_RECEIVED',
    kind_label: 'Candidature',
    title: 'Jean JOSEPH a postulé',
    detail: 'Chargé de crédit · CC-2026-04',
    at: minutesAgo(60),
    link: '/admin/postes/7',
    unread: false,
  },
]

function renderLayout(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout title="Tableau de bord"><p>Contenu</p></AdminLayout>} />
        <Route path="/admin/validation/:id" element={<p>Écran du certificat</p>} />
        <Route path="/admin/notifications" element={<NotificationsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getAdminFrame.mockResolvedValue(frame('AGENT_RH'))
  getNotifications.mockResolvedValue({ items: ITEMS, unread_count: 1, has_more: false })
  markNotificationRead.mockResolvedValue(undefined)
  markAllNotificationsRead.mockResolvedValue(undefined)
})

afterEach(() => setDesktop(false))

describe('US-116 — la cloche', () => {
  it('CA-01 : la cloche dit le nombre de notifications non lues', async () => {
    renderLayout()
    const bell = await screen.findByRole('link', { name: 'Notifications, 1 non lue' }, { timeout: 4000 })
    expect(bell).toHaveAttribute('href', '/admin/notifications')
  })

  it('CA-03 : pas de cloche pour la lecture seule ni le responsable du référentiel', async () => {
    getAdminFrame.mockResolvedValue(frame('READONLY'))
    renderLayout()
    await screen.findByText('Agent RH Démo 1 · Agent RH')
    expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument()
    expect(getNotifications).not.toHaveBeenCalled()
  })

  it('CA-01, CA-02 : sur ordinateur, la liste s’ouvre ; une notification ouvre l’élément et devient lue', async () => {
    setDesktop(true)
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 non lue' }))

    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('Aujourd’hui')).toBeInTheDocument()
    const first = within(panel).getByRole('link', { name: /Marie PIERRE a déposé un certificat/ })
    expect(first).toHaveTextContent('Non lue')
    expect(within(panel).getByRole('link', { name: 'Voir toutes les notifications' })).toHaveAttribute('href', '/admin/notifications')

    await user.click(first)
    expect(markNotificationRead).toHaveBeenCalledWith('certificate:c1')
    expect(await screen.findByText('Écran du certificat')).toBeInTheDocument()
  })

  it('CA-04 : « Tout marquer comme lu »', async () => {
    setDesktop(true)
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 non lue' }))
    getNotifications.mockResolvedValue({ items: ITEMS.map((item) => ({ ...item, unread: false })), unread_count: 0, has_more: false })

    await user.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }))
    expect(markAllNotificationsRead).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Notifications, aucune non lue' })).toBeInTheDocument()
  })

  it('CA-02 : les filtres', async () => {
    setDesktop(true)
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 non lue' }))
    await user.click(screen.getByRole('button', { name: 'Retards' }))
    await waitFor(() => expect(getNotifications).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'CERTIFICATE_LATE' })))
    expect(screen.getByRole('button', { name: 'Retards' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('US-116 — la page Notifications', () => {
  it('liste les notifications par jour, et charge la suite à la demande', async () => {
    const user = userEvent.setup()
    getNotifications.mockResolvedValue({ items: ITEMS, unread_count: 1, has_more: true })
    renderLayout('/admin/notifications')
    expect(await screen.findByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Jean JOSEPH a postulé/ })).toHaveAttribute('href', '/admin/postes/7')

    await user.click(screen.getByRole('button', { name: 'Afficher plus' }))
    await waitFor(() => expect(getNotifications).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100 })))
  })

  it('aucune notification : le dit simplement', async () => {
    getNotifications.mockResolvedValue({ items: [], unread_count: 0, has_more: false })
    renderLayout('/admin/notifications')
    expect(await screen.findByText('Aucune notification pour le moment.')).toBeInTheDocument()
  })
})

describe('US-116 — quand', () => {
  const now = new Date('2026-10-12T15:00:00')
  it('en minutes, en heures, hier, puis la date', () => {
    expect(formatWhen('2026-10-12T14:50:00', now)).toBe('il y a 10 min')
    expect(formatWhen('2026-10-12T14:59:40', now)).toBe('à l’instant')
    expect(formatWhen('2026-10-12T12:00:00', now)).toBe('il y a 3 h')
    expect(formatWhen('2026-10-11T16:20:00', now)).toBe('hier à 16:20')
    expect(formatWhen('2026-10-05T08:00:00', now)).toBe('05/10/2026 à 08:00')
  })
})
