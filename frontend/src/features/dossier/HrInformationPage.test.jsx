import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { confirmHrInformation, getDossier, reportHrError } from '../../api/dossier.js'
import HrInformationPage, { seniority } from './HrInformationPage.jsx'
import { dossierFixture } from './testData.js'

vi.mock('../../api/dossier.js', () => ({ getDossier: vi.fn(), confirmHrInformation: vi.fn(), reportHrError: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/profil/informations-rh']}>
      <Routes>
        <Route path="/profil/informations-rh" element={<HrInformationPage />} />
        <Route path="/accueil" element={<p>Écran d’accueil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const card = (name) => screen.getByRole('region', { name })

describe('US-203 — Mes informations RH (section 3 / 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDossier.mockResolvedValue(dossierFixture())
  })

  it('CA-01 : les trois informations s’affichent sans champ modifiable', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mes informations RH' })).toBeVisible()
    expect(screen.getByText('Section 3 / 3')).toBeVisible()
    expect(within(card("Agence d'affectation")).getByText('Agence Démo')).toBeVisible()
    expect(within(card("Agence d'affectation")).getByText('Confirmé le 06/10/2026')).toBeVisible()
    expect(within(card('Poste actuel')).getByText('En attente de votre confirmation')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('US-207 CA-04 : cadenas sur chaque information, ancienneté, « Valider et terminer mon profil » (écran 07)', async () => {
    renderPage()

    expect(await within(await screen.findByRole('region', { name: 'Poste actuel' })).findByLabelText('Non modifiable')).toBeVisible()
    expect(seniority('12/03/2018', new Date(2026, 9, 9))).toBe('~8 ans')
    await userEvent.click(screen.getByRole('button', { name: /Valider et terminer mon profil/ }))
    expect(await screen.findByText('Écran d’accueil')).toBeVisible()
  })

  it('CA-02 : « C’est exact » confirme l’information', async () => {
    confirmHrInformation.mockResolvedValue(
      dossierFixture({
        hr_information: dossierFixture().hr_information.map((item) =>
          item.key === 'position_confirmed' ? { ...item, status: 'CONFIRMED', answered_at: '2026-10-08T09:00:00Z' } : item,
        ),
      }),
    )
    renderPage()
    await userEvent.click(within(await screen.findByRole('region', { name: 'Poste actuel' })).getByRole('button', { name: "C'est exact" }))

    expect(confirmHrInformation).toHaveBeenCalledWith('position_confirmed')
    expect(await within(card('Poste actuel')).findByText('Confirmé le 08/10/2026')).toBeVisible()
  })

  it('CA-03 : signaler une erreur demande la bonne information, la précision est facultative', async () => {
    reportHrError.mockResolvedValue(
      dossierFixture({
        hr_information: dossierFixture().hr_information.map((item) =>
          item.key === 'hire_date_confirmed' ? { ...item, status: 'REPORTED', answered_at: '2026-10-08T09:00:00Z' } : item,
        ),
      }),
    )
    renderPage()
    const hire = await screen.findByRole('region', { name: "Date d'embauche" })
    await userEvent.click(within(hire).getByRole('button', { name: 'Signaler une erreur' }))

    expect(within(hire).getByText('Valeur enregistrée : 12/03/2018')).toBeVisible()
    expect(within(hire).getByText(/compte comme une confirmation/)).toBeVisible()
    await userEvent.type(within(hire).getByLabelText('Quelle est la bonne information ?'), '12/03/2017')
    await userEvent.click(within(hire).getByRole('button', { name: 'Envoyer aux RH' }))

    expect(reportHrError).toHaveBeenCalledWith('hire_date_confirmed', { correct_value: '12/03/2017', comment: '' })
    expect(await within(card("Date d'embauche")).findByText('Signalé aux RH le 08/10/2026')).toBeVisible()
  })

  it('CA-03 : sans bonne information, le message s’affiche près du champ', async () => {
    reportHrError.mockRejectedValue(
      new ApiError(422, 'INVALID_FIELD', 'Indiquez la bonne information pour que les RH puissent corriger.', 'correct_value'),
    )
    renderPage()
    const hire = await screen.findByRole('region', { name: "Date d'embauche" })
    await userEvent.click(within(hire).getByRole('button', { name: 'Signaler une erreur' }))
    await userEvent.click(within(hire).getByRole('button', { name: 'Envoyer aux RH' }))

    expect(within(hire).getByLabelText('Quelle est la bonne information ?')).toHaveAccessibleDescription(
      /Indiquez la bonne information/,
    )
  })
})
