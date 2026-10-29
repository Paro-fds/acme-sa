import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { getDossier, saveContactAndEducation } from '../../api/dossier.js'
import ContactEducationPage from './ContactEducationPage.jsx'
import { dossierFixture } from './testData.js'

vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), saveContactAndEducation: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/profil/contact-etudes']}>
      <Routes>
        <Route path="/profil/contact-etudes" element={<ContactEducationPage />} />
        <Route path="/profil/informations-rh" element={<p>Section 3</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('US-202 — Contact d’urgence et études (section 2 / 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDossier.mockResolvedValue(dossierFixture())
    saveContactAndEducation.mockResolvedValue(dossierFixture())
  })

  it('CA-04 : le lien se choisit dans la liste, le niveau parmi les niveaux proposés', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: "Contact d'urgence & études" })).toBeVisible()
    expect(screen.getByText('Section 2 / 3')).toBeVisible()
    const relationship = screen.getByLabelText('Lien avec vous')
    expect([...relationship.options].map((option) => option.text)).toEqual([
      'Choisir…',
      'Conjoint·e',
      'Parent',
      'Enfant',
      'Frère / Sœur',
      'Autre',
    ])
    expect(screen.getByRole('radio', { name: /Licence/ })).not.toBeChecked()
  })

  it('enregistre le contact et le niveau, puis passe à la section 3 / 3', async () => {
    renderPage()
    await userEvent.type(await screen.findByLabelText('Nom complet de la personne à contacter'), 'Jean Baptiste Pierre')
    await userEvent.selectOptions(screen.getByLabelText('Lien avec vous'), 'SIBLING')
    await userEvent.type(screen.getByLabelText("Téléphone d'urgence"), '4812 8901')
    await userEvent.click(screen.getByRole('radio', { name: /Licence/ }))
    await userEvent.click(screen.getByRole('button', { name: /Enregistrer et continuer/ }))

    expect(saveContactAndEducation).toHaveBeenCalledWith({
      contact_name: 'Jean Baptiste Pierre',
      contact_relationship: 'SIBLING',
      contact_telephone: '4812 8901',
      education_level: 'LICENCE',
    })
    expect(await screen.findByText('Section 3')).toBeVisible()
  })

  it('CA-02 : le message d’erreur s’affiche près du champ concerné', async () => {
    saveContactAndEducation.mockRejectedValue(
      new ApiError(422, 'INVALID_FIELD', 'Ajoutez le numéro de téléphone de cette personne.', 'contact_telephone'),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enregistrer et continuer/ }))

    expect(screen.getByLabelText("Téléphone d'urgence")).toHaveAccessibleDescription(
      /Ajoutez le numéro de téléphone de cette personne/,
    )
  })
})
