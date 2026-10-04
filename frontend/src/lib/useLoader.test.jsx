import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useLoader } from './useLoader.js'
import { ApiError } from '../api/client.js'

function LoginProbe() {
  const { state } = useLocation()
  return <p>Connexion : {state?.message}</p>
}

function Screen({ load }) {
  const { data, error, loading } = useLoader(load)
  if (loading) return <p>Chargement…</p>
  if (error) return <p>Erreur : {error.message}</p>
  return <p>Données : {data}</p>
}

function renderWith(load) {
  render(
    <MemoryRouter initialEntries={['/profil']}>
      <Routes>
        <Route path="/" element={<LoginProbe />} />
        <Route path="/profil" element={<Screen load={load} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useLoader', () => {
  it('affiche les données chargées', async () => {
    renderWith(() => Promise.resolve('profil'))

    expect(await screen.findByText('Données : profil')).toBeInTheDocument()
  })

  it("US-03 CA-07 : une session expirée renvoie à l'identification avec le message", async () => {
    renderWith(() => Promise.reject(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.')))

    expect(await screen.findByText('Connexion : Votre session a expiré. Reconnectez-vous.')).toBeInTheDocument()
  })

  it("les autres erreurs restent affichées sur l'écran", async () => {
    renderWith(() => Promise.reject(new ApiError(500, 'UNKNOWN_ERROR', 'Une erreur est survenue.')))

    expect(await screen.findByText('Erreur : Une erreur est survenue.')).toBeInTheDocument()
  })

  it('`key` : un nouveau chargement part quand la clé change, avec la dernière fonction, et les données restent affichées', async () => {
    const pending = {}
    function Keyed() {
      const [term, setTerm] = useState('a')
      const { data } = useLoader(() => new Promise((resolve) => (pending[term] = resolve)), { key: term })
      return (
        <>
          <button type="button" onClick={() => setTerm('b')}>Changer</button>
          <p>Données : {data ?? '—'}</p>
        </>
      )
    }
    render(
      <MemoryRouter>
        <Keyed />
      </MemoryRouter>,
    )
    pending.a('A')
    expect(await screen.findByText('Données : A')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Changer' }))

    expect(screen.getByText('Données : A')).toBeInTheDocument()
    pending.b('B')
    expect(await screen.findByText('Données : B')).toBeInTheDocument()
  })

  it('`key` : une réponse arrivée après un changement de clé est ignorée', async () => {
    const pending = {}
    function Keyed() {
      const [term, setTerm] = useState('a')
      const { data } = useLoader(() => new Promise((resolve) => (pending[term] = resolve)), { key: term })
      return (
        <>
          <button type="button" onClick={() => setTerm('b')}>Changer</button>
          <p>Données : {data ?? '—'}</p>
        </>
      )
    }
    render(
      <MemoryRouter>
        <Keyed />
      </MemoryRouter>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Changer' }))
    pending.b('B')
    expect(await screen.findByText('Données : B')).toBeInTheDocument()

    pending.a('A (en retard)')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.getByText('Données : B')).toBeInTheDocument()
  })
})
