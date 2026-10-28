import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDossier, getFreshness } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import { getMyNotifications, markAllMyNotificationsRead, markMyNotificationRead } from '../../api/notifications.js'
import { setDesktop } from '../../lib/testViewport.js'
import EmployeeHomePage from '../dashboard/EmployeeHomePage.jsx'
import EmployeeNotificationBell from './EmployeeNotificationBell.jsx'
import MyNotificationsPage from './MyNotificationsPage.jsx'

vi.mock('../../api/notifications.js', () => ({
  getMyNotifications: vi.fn(),
  markMyNotificationRead: vi.fn(),
  markAllMyNotificationsRead: vi.fn(),
}))
vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), getFreshness: vi.fn(), confirmStillAccurate: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const OPENING = {
  key: 'opening:7',
  kind: 'OPENING',
  kind_label: 'Poste',
  title: 'Nouveau poste ouvert pour vous',
  detail: 'Comptable fictif · Direction Démo Comptable · jusqu’au 15/11/2026',
  at: '2026-10-14T09:00:00Z',
  link: '/carriere',
  unread: true,
}
const VALIDATED = {
  key: 'certificate:c1:VALIDATED',
  kind: 'CERTIFICATE_VALIDATED',
  kind_label: 'Certificat',
  title: 'Certificat validé',
  detail: 'Licence en comptabilité',
  at: '2026-10-03T09:00:00Z',
  link: '/certificats',
  unread: false,
}

function Where() {
  return <p>Page : {useLocation().pathname}</p>
}

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/carriere" element={<Where />} />
        <Route path="/certificats" element={<Where />} />
        <Route path="/notifications" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getMyNotifications.mockResolvedValue({ items: [OPENING, VALIDATED], unread_count: 1, has_more: false })
  markMyNotificationRead.mockResolvedValue(null)
  markAllMyNotificationsRead.mockResolvedValue(null)
})

afterEach(() => setDesktop(false))

describe('US-120 CA-01 — la cloche de l’espace employé', () => {
  it('sur téléphone : le nombre de non lues, et un lien vers la page Notifications', async () => {
    renderAt('/accueil', <EmployeeNotificationBell />)
    const bell = await screen.findByRole('link', { name: 'Notifications, 1 non lue' })
    expect(bell).toHaveAttribute('href', '/notifications')
  })

  it('sur ordinateur : la cloche ouvre la liste ; une notification ouverte devient lue et mène à sa page', async () => {
    setDesktop(true)
    const user = userEvent.setup()
    renderAt('/accueil', <EmployeeNotificationBell />)
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 non lue' }))

    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('Nouveau poste ouvert pour vous')).toBeInTheDocument()
    expect(within(panel).getByText('Certificat validé')).toBeInTheDocument()
    await user.click(within(panel).getByText('Nouveau poste ouvert pour vous'))

    expect(markMyNotificationRead).toHaveBeenCalledWith('opening:7')
    expect(await screen.findByText('Page : /carriere')).toBeInTheDocument()
  })

  it('aucune non lue : la cloche le dit, sans pastille', async () => {
    getMyNotifications.mockResolvedValue({ items: [VALIDATED], unread_count: 0, has_more: false })
    renderAt('/accueil', <EmployeeNotificationBell />)
    expect(await screen.findByRole('link', { name: 'Notifications, aucune non lue' })).toBeInTheDocument()
  })
})

describe('US-120 CA-05 — la page Notifications', () => {
  it('liste les notifications, la non lue marquée, et « Tout marquer comme lu »', async () => {
    const user = userEvent.setup()
    getProfile.mockResolvedValue({ first_name: 'Jean' })
    renderAt('/notifications-liste', <MyNotificationsPage />)

    const list = await screen.findByRole('list', { name: 'Mes notifications' })
    const [first, second] = within(list).getAllByRole('listitem')
    expect(within(first).getByText('Nouveau poste ouvert pour vous')).toBeInTheDocument()
    expect(within(first).getByText('Non lue')).toBeInTheDocument()
    expect(within(second).queryByText('Non lue')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }))
    expect(markAllMyNotificationsRead).toHaveBeenCalled()
    // cloche + page, puis la page après « tout lu » : le rechargement suit la réponse, il peut arriver après le clic
    await waitFor(() => expect(getMyNotifications).toHaveBeenCalledTimes(3))
  })

  it('aucune notification : le dit simplement', async () => {
    getMyNotifications.mockResolvedValue({ items: [], unread_count: 0, has_more: false })
    renderAt('/notifications-liste', <MyNotificationsPage />)
    expect(await screen.findByText('Aucune notification pour le moment.')).toBeInTheDocument()
  })
})

describe('US-120 CA-04, US-136 CA-05 — sur l’accueil, la cloche signale le poste ouvert pour moi', () => {
  it('plus d’« Activité récente » ni de « Nouveau pour vous » : la notification est dans la cloche', async () => {
    getProfile.mockResolvedValue({
      first_name: 'Lucie',
      last_name: 'EXEMPLE',
      position: 'Chargée de crédit',
      affectation: { agency: 'Agence Démo', region: null, direction: null },
      completion: { percent: 87, complete: 7, total: 8, is_complete: false, elements: [{ key: 'telephone', label: 'Téléphone', complete: false }] },
    })
    getFreshness.mockResolvedValue({ items: [], stale_count: 0 })
    getDossier.mockResolvedValue({ consent: { information_notice_at: '2026-10-08T09:00:00Z', whatsapp: false } })
    renderAt('/accueil', <EmployeeHomePage />)
    await screen.findByRole('heading', { name: 'Bonjour Lucie' })
    expect(await screen.findByRole('link', { name: /Notifications, 1 non lue/ })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Activité récente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Nouveau pour vous' })).not.toBeInTheDocument()
  })
})
