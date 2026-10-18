import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endSession, getSessionOptions, keepAlive } from '../api/session.js'
import { ApiError } from '../api/client.js'
import { LAST_ACTIVITY_KEY, resetIdleOptions, useIdleLogout } from './useIdleLogout.js'

vi.mock('../api/session.js', () => ({ getSessionOptions: vi.fn(), keepAlive: vi.fn(), endSession: vi.fn() }))

const MINUTE = 60_000
const NOTICE = 'Vous avez été déconnecté après 15 minutes sans activité. Reconnectez-vous.'

function Screen({ space }) {
  useIdleLogout(space)
  return <p>Écran connecté</p>
}

function Login() {
  const location = useLocation()
  return <p role="status">{location.state?.notice ?? location.state?.message}</p>
}

function renderSpace(space = 'employee') {
  return render(
    <MemoryRouter initialEntries={['/ecran']}>
      <Routes>
        <Route path="/ecran" element={<Screen space={space} />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/admin/connexion" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )
}

const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  resetIdleOptions()
  window.localStorage.clear()
  getSessionOptions.mockResolvedValue({ employee_idle_minutes: 15, admin_idle_minutes: 15 })
  keepAlive.mockResolvedValue(null)
  endSession.mockResolvedValue(null)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('US-125 — déconnexion après 15 minutes sans activité', () => {
  it("CA-01, CA-04 — l'employé inactif revient à la connexion avec le message", async () => {
    renderSpace()
    await wait(14 * MINUTE)
    expect(screen.getByText('Écran connecté')).toBeInTheDocument()
    await wait(MINUTE + 15_000)
    expect(endSession).toHaveBeenCalledWith('employee')
    expect(screen.getByRole('status')).toHaveTextContent(NOTICE)
  })

  it("CA-01 — l'espace de gestion ferme sa propre session et revient à sa connexion", async () => {
    renderSpace('admin')
    await wait(16 * MINUTE)
    expect(endSession).toHaveBeenCalledWith('admin')
    expect(screen.getByRole('status')).toHaveTextContent(NOTICE)
  })

  it('CA-02 — une saisie remet le compteur à zéro et prévient le serveur', async () => {
    renderSpace()
    await wait(10 * MINUTE)
    fireEvent.keyDown(window, { key: 'a' })
    await wait(15_000)
    expect(keepAlive).toHaveBeenCalledExactlyOnceWith('employee')
    await wait(10 * MINUTE)
    expect(screen.getByText('Écran connecté')).toBeInTheDocument()
    await wait(6 * MINUTE)
    expect(screen.getByRole('status')).toHaveTextContent(NOTICE)
  })

  it('CA-02 — un clic et un défilement comptent aussi', async () => {
    renderSpace()
    await wait(10 * MINUTE)
    fireEvent.pointerDown(window)
    await wait(10 * MINUTE)
    fireEvent.scroll(window)
    await wait(10 * MINUTE)
    expect(screen.getByText('Écran connecté')).toBeInTheDocument()
  })

  it("CA-03 — l'activité d'un autre onglet compte", async () => {
    renderSpace()
    await wait(10 * MINUTE)
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    await wait(10 * MINUTE)
    expect(screen.getByText('Écran connecté')).toBeInTheDocument()
    expect(endSession).not.toHaveBeenCalled()
  })

  it("CA-05 — sans activité, rien n'est envoyé au serveur pour garder la session", async () => {
    renderSpace()
    await wait(14 * MINUTE)
    expect(keepAlive).not.toHaveBeenCalled()
  })

  it('la session déjà fermée par le serveur ramène aussi à la connexion', async () => {
    keepAlive.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.'))
    renderSpace()
    await wait(2 * MINUTE)
    fireEvent.keyDown(window, { key: 'a' })
    await wait(15_000)
    expect(screen.getByRole('status')).toHaveTextContent('Votre session a expiré. Reconnectez-vous.')
  })

  it('la durée vient du serveur', async () => {
    getSessionOptions.mockResolvedValue({ employee_idle_minutes: 5, admin_idle_minutes: 15 })
    renderSpace()
    await wait(5 * MINUTE + 15_000)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Vous avez été déconnecté après 5 minutes sans activité. Reconnectez-vous.',
    )
  })
})
