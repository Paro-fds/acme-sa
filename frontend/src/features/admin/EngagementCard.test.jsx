import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEngagement } from '../../api/admin.js'
import EngagementCard from './EngagementCard.jsx'

vi.mock('../../api/admin.js', () => ({ getEngagement: vi.fn() }))

const FEEDBACK = (facile, correct, difficile) => [
  { rating: 3, label: 'Facile', count: facile },
  { rating: 2, label: 'Correct', count: correct },
  { rating: 1, label: 'Difficile', count: difficile },
]

function renderCard() {
  render(
    <MemoryRouter>
      <EngagementCard />
    </MemoryRouter>,
  )
}

describe('US-605 — Engagement des employés', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-01 : employés connectés et connexions des 30 derniers jours', async () => {
    getEngagement.mockResolvedValue({ logins_30_days: 12, employees_30_days: 5, active_employees: 7, feedback: FEEDBACK(0, 0, 0) })
    renderCard()

    const card = await screen.findByRole('region', { name: 'Engagement des employés' })
    expect(card).toHaveTextContent('5 employés sur 7 se sont connectés ces 30 derniers jours (12 connexions).')
    expect(card).toHaveTextContent('Aucune réponse pour l\'instant.')
  })

  it('CA-02 : les réponses à la question en un clic sont comptées', async () => {
    getEngagement.mockResolvedValue({ logins_30_days: 3, employees_30_days: 2, active_employees: 7, feedback: FEEDBACK(4, 1, 2) })
    renderCard()

    const list = await screen.findByRole('list', { name: 'Avis après le dépôt' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['4Facile', '1Correct', '2Difficile'])
  })
})
