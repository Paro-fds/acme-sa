import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdateStateCard from './UpdateStateCard.jsx'

// Horodatages sans fuseau : interprétés en heure locale, donc affichage déterministe.
const NOT_DONE = { state: 'NOT_DONE', accepted: null, updated_at: null, submitted_at: null }
const IN_PROGRESS = { state: 'IN_PROGRESS', accepted: true, updated_at: '2026-10-04T14:32:00', submitted_at: null }
const DONE = {
  state: 'DONE',
  accepted: true,
  updated_at: '2026-10-04T15:10:00',
  submitted_at: '2026-10-04T15:10:00',
}
const ANSWERED_NO = { state: 'NOT_DONE', accepted: false, updated_at: '2026-10-04T14:00:00', submitted_at: null }

function renderCard(update, handlers = {}) {
  const props = { onYes: vi.fn(), onNo: vi.fn(), onResume: vi.fn(), ...handlers }
  render(<UpdateStateCard update={update} {...props} />)
  return props
}

const startButton = () => screen.queryByRole('button', { name: 'Oui, mettre à jour mon dossier' })
const resumeButton = () => screen.queryByRole('button', { name: 'Reprendre la mise à jour' })

describe('UpdateStateCard (US-06)', () => {
  it('CA-01 : sans mise à jour, « Non effectuée » et la question Oui/Non', async () => {
    const { onYes } = renderCard(NOT_DONE)

    expect(screen.getByText('Non effectuée')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Souhaitez-vous mettre à jour votre dossier ?' })).toBeInTheDocument()
    expect(resumeButton()).not.toBeInTheDocument()

    await userEvent.setup().click(startButton())
    expect(onYes).toHaveBeenCalledOnce()
  })

  it('CA-02 : brouillon, « En cours », date de dernière sauvegarde et bouton « Reprendre »', async () => {
    const { onResume } = renderCard(IN_PROGRESS)

    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Dernière sauvegarde le 04/10/2026 à 14:32')).toBeInTheDocument()
    expect(startButton()).not.toBeInTheDocument()

    await userEvent.setup().click(resumeButton())
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('CA-03 : soumise, « Effectuée », date de soumission et aucun bouton de modification', () => {
    renderCard(DONE)

    expect(screen.getByText('Effectuée')).toBeInTheDocument()
    expect(screen.getByText('Mise à jour soumise le 04/10/2026 à 15:10')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('CA-04 : après une réponse « Non », « Non effectuée » et le « Oui » reste possible', () => {
    renderCard(ANSWERED_NO)

    expect(screen.getByText('Non effectuée')).toBeInTheDocument()
    expect(startButton()).toBeEnabled()
    expect(resumeButton()).not.toBeInTheDocument()
  })

  it('US-08 : sans mise à jour, les choix Oui et Non sont proposés', () => {
    renderCard(NOT_DONE)

    expect(startButton()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non, consulter uniquement' })).toBeInTheDocument()
  })

  it('une erreur est affichée quel que soit l’état', () => {
    renderCard(IN_PROGRESS, { error: 'Le serveur est injoignable. Vérifiez votre connexion.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Le serveur est injoignable.')
  })
})
