import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ConfirmationStep from './ConfirmationStep.jsx'
import { getMyUpdate, getProfile } from '../../api/employee.js'

vi.mock('../../api/employee.js', () => ({ getMyUpdate: vi.fn(), getProfile: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const CHANGE = { field_name: 'telephone_number', label: 'Téléphone', old_value: '+50937221111', new_value: '+509 3722 2222' }

function renderStep(update) {
  getMyUpdate.mockResolvedValue(update)
  getProfile.mockResolvedValue({ agency_code: 'PV' })
  render(
    <MemoryRouter initialEntries={['/mise-a-jour/confirmation']}>
      <Routes>
        <Route path="/profil" element={<p>Écran profil</p>} />
        <Route path="/mise-a-jour/confirmation" element={<ConfirmationStep />} />
      </Routes>
    </MemoryRouter>,
  )
}

const SUBMITTED = { state: 'DONE', submitted_at: '2026-10-04T15:10:00', changes: [CHANGE, { ...CHANGE, field_name: 'address_line_1' }] }

describe('ConfirmationStep (US-12)', () => {
  it('CA-02 : « Votre mise à jour a bien été transmise », la date et l’étape 4 sur 4', async () => {
    renderStep(SUBMITTED)

    expect(await screen.findByRole('heading', { name: 'Votre mise à jour a bien été transmise' })).toBeInTheDocument()
    expect(screen.getByText('Étape 4 sur 4 : Confirmation')).toBeInTheDocument()
    const receipt = screen.getByRole('region', { name: "Accusé d'enregistrement" })
    expect(within(receipt).getByText('04/10/2026 à 15:10')).toBeInTheDocument()
    expect(within(receipt).getByText('2 informations')).toBeInTheDocument()
    expect(within(receipt).getByText('Soumise')).toBeInTheDocument()
  })

  it('CA-05 : une soumission sans changement est présentée comme une confirmation', async () => {
    renderStep({ ...SUBMITTED, changes: [] })

    expect(await screen.findByText('Aucune (informations confirmées)')).toBeInTheDocument()
  })

  it('« Retour à mon profil » ramène au profil', async () => {
    renderStep(SUBMITTED)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Retour à mon profil' }))

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('sans soumission, l’écran renvoie au profil', async () => {
    renderStep({ state: 'IN_PROGRESS', submitted_at: null, changes: [] })

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })
})
