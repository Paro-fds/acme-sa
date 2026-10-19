import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmStillAccurate } from '../../api/dossier.js'
import StillAccurateCard from './StillAccurateCard.jsx'

vi.mock('../../api/dossier.js', () => ({ confirmStillAccurate: vi.fn() }))

const item = (key, label, value, state) => ({
  key,
  label,
  value,
  confirmed_at: '2025-10-01T09:00:00Z',
  expires_on: '2026-10-01',
  reminder_on: '2026-09-01',
  state,
})

const STALE = {
  stale_count: 2,
  items: [
    item('telephone', 'Téléphone', '+509 3712 3456', 'STALE'),
    item('address', 'Adresse', '12 rue Capois, Port-au-Prince', 'STALE'),
    item('agency_confirmed', "Agence d'affectation", 'Agence Démo', 'FRESH'),
  ],
}

function renderCard(freshness) {
  return render(
    <MemoryRouter>
      <StillAccurateCard freshness={freshness} />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('US-205 — confirmer ses informations chaque année', () => {
  it('rien de périmé : aucune carte', () => {
    const { container } = renderCard({ items: [item('telephone', 'Téléphone', '+509 3712 3456', 'DUE_SOON')], stale_count: 0 })
    expect(container).toBeEmptyDOMElement()
  })

  it('CA-01 : montre les informations périmées, avec leur valeur', () => {
    renderCard(STALE)
    const card = screen.getByRole('region', { name: 'Ces informations sont-elles toujours exactes ?' })
    const rows = within(card).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Téléphone')
    expect(rows[0]).toHaveTextContent('+509 3712 3456')
    expect(card).toHaveTextContent('Vous ne les avez pas confirmées depuis plus d’un an.')
    expect(within(card).getByRole('link', { name: /Non, je corrige/ })).toHaveAttribute('href', '/profil')
  })

  it('CA-02 : « Oui » confirme tout en un clic', async () => {
    const user = userEvent.setup()
    confirmStillAccurate.mockResolvedValue({ items: [], stale_count: 0 })
    renderCard(STALE)
    await user.click(screen.getByRole('button', { name: 'Oui, toujours exactes' }))
    expect(confirmStillAccurate).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent('Merci, vos informations sont confirmées pour un an.')
    expect(screen.queryByRole('button', { name: 'Oui, toujours exactes' })).not.toBeInTheDocument()
  })
})
