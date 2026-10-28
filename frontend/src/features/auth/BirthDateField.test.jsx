import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import BirthDateField from './BirthDateField.jsx'

function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <BirthDateField value={value} onChange={setValue} />
      <output aria-label="valeur">{value}</output>
    </>
  )
}

describe('BirthDateField (US-1014)', () => {
  it('CA-01 : un seul champ masqué, au clavier numérique, avec l’exemple', () => {
    render(<Harness />)
    const field = screen.getByLabelText('Date de naissance')
    expect(field).toHaveAttribute('type', 'password')
    expect(field).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByText(/27101990 pour le 27 octobre 1990/)).toBeInTheDocument()
  })

  it('CA-02 : ne garde que les chiffres, au plus huit', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Date de naissance'), '27/10/1990 99')

    expect(screen.getByLabelText('valeur')).toHaveTextContent(/^27101990$/)
  })

  it('CA-03 : Afficher révèle la date, Masquer la cache', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const field = screen.getByLabelText('Date de naissance')

    await user.click(screen.getByRole('button', { name: 'Afficher : Date de naissance' }))
    expect(field).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Masquer : Date de naissance' }))
    expect(field).toHaveAttribute('type', 'password')
  })
})
