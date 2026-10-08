import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../routes.jsx'

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DemoBanner (US-001)', () => {
  it.each(['/', '/connexion', '/connexion/premiere', '/admin/connexion'])(
    'CA-04 : en démonstration, le bandeau figure sur %s',
    (path) => {
      vi.stubEnv('VITE_APP_ENV', 'demo')
      renderAt(path)

      expect(screen.getByRole('note')).toHaveTextContent('Démonstration · données fictives')
    },
  )

  it('CA-04 : en recette aussi', () => {
    vi.stubEnv('VITE_APP_ENV', 'recette')
    renderAt('/')

    expect(screen.getByRole('note')).toHaveTextContent('Démonstration · données fictives')
  })

  it("CA-04 : en production ou sur le poste, aucun bandeau", () => {
    renderAt('/')

    expect(screen.queryByText('Démonstration · données fictives')).not.toBeInTheDocument()
  })
})
