import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DecisionCard from './DecisionCard.jsx'

function renderCard(props = {}) {
  const handlers = { onYes: vi.fn(), onNo: vi.fn() }
  render(<DecisionCard {...handlers} {...props} />)
  return handlers
}

const yesButton = () => screen.getByRole('button', { name: 'Oui, mettre à jour mon dossier' })
const noButton = () => screen.getByRole('button', { name: 'Non, consulter uniquement' })

describe('DecisionCard (US-08)', () => {
  it('CA-01 : « Oui » déclenche l’ouverture de la mise à jour', async () => {
    const { onYes, onNo } = renderCard()

    await userEvent.setup().click(yesButton())

    expect(onYes).toHaveBeenCalledOnce()
    expect(onNo).not.toHaveBeenCalled()
  })

  it('CA-02 : « Non » enregistre le refus', async () => {
    const { onYes, onNo } = renderCard()

    await userEvent.setup().click(noButton())

    expect(onNo).toHaveBeenCalledOnce()
    expect(onYes).not.toHaveBeenCalled()
  })

  it('CA-02 : le message de confirmation du « Non » est affiché', () => {
    renderCard({ notice: "C'est noté. Vous pourrez mettre à jour votre dossier à tout moment." })

    expect(screen.getByRole('status')).toHaveTextContent(
      "C'est noté. Vous pourrez mettre à jour votre dossier à tout moment.",
    )
  })

  it('les deux boutons sont désactivés pendant l’envoi', () => {
    renderCard({ sending: true })

    expect(yesButton()).toBeDisabled()
    expect(noButton()).toBeDisabled()
  })

  it('une erreur est affichée sous les boutons', () => {
    renderCard({ error: 'Le serveur est injoignable. Vérifiez votre connexion.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Le serveur est injoignable.')
  })
})
