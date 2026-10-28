import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AuditLogPage from './AuditLogPage.jsx'
import { getAuditLog } from '../../../api/admin.js'

vi.mock('../../../api/admin.js', () => ({
  getAuditLog: vi.fn(),
}))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const mockAuditEntry = (id, overrides = {}) => ({
  id,
  at: '2026-10-06T14:12:00Z',
  actor_id: 'agent-1',
  actor_name: 'Agent RH Démo 1',
  action: 'VALIDATION',
  action_label: 'Validation',
  target_id: 'EMP-1001',
  target_name: 'Lucie Exemple',
  details: 'Licence en Sciences comptables — niveau corrigé : Licence',
  ...overrides,
})

function renderAt(path = '/admin/audit') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/audit" element={<AuditLogPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-604 — Rendre compte de chaque action (Écran A11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuditLog.mockResolvedValue({
      items: [
        mockAuditEntry(1),
        mockAuditEntry(2, {
          at: '2026-10-06T10:20:00Z',
          actor_name: 'Agent RH Démo 2',
          action: 'REJECTION',
          action_label: 'Rejet',
          target_name: 'Marc Démo',
          details: 'Motif : Document illisible ou de mauvaise qualité',
        }),
      ],
      total: 2,
      page: 1,
      page_size: 20,
      page_count: 1,
      actors: ['Administrateur Démo', 'Agent RH Démo 1', 'Agent RH Démo 2'],
      actions: ['VALIDATION', 'REJECTION', 'EXPORT', 'DOSSIER_VIEW'],
    })
  })

  it('CA-01 : affiche les colonnes et badges d’action conformes à la maquette A11', async () => {
    renderAt()

    expect(await screen.findByText('Toutes les actions des RH dans PAM.')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: "Journal d'audit" })
    expect(within(table).getByText('Agent RH Démo 1')).toBeInTheDocument()
    expect(within(table).getByText('Validation')).toBeInTheDocument()
    expect(within(table).getByText('Lucie Exemple')).toBeInTheDocument()
    expect(within(table).getByText(/Licence en Sciences comptables/)).toBeInTheDocument()

    expect(within(table).getByText('Agent RH Démo 2')).toBeInTheDocument()
    expect(within(table).getByText('Rejet')).toBeInTheDocument()
    expect(within(table).getByText('Marc Démo')).toBeInTheDocument()
  })

  it('CA-03 : permet de filtrer par type d’action, période et personne', async () => {
    const user = userEvent.setup()
    renderAt()

    await screen.findByRole('table', { name: "Journal d'audit" })

    // Filtrer par Type d'action
    const actionSelect = screen.getByLabelText("Type d'action")
    await user.selectOptions(actionSelect, 'VALIDATION')

    expect(getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VALIDATION',
      }),
    )

    // Filtrer par Personne
    const actorSelect = screen.getByLabelText('Personne')
    await user.selectOptions(actorSelect, 'Agent RH Démo 1')

    expect(getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'Agent RH Démo 1',
      }),
    )

    // Filtrer par Période
    const periodSelect = screen.getByLabelText('Période')
    await user.selectOptions(periodSelect, '2026-10')

    expect(getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        period: '2026-10',
      }),
    )
  })
})
