import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import BirthDateField from './BirthDateField.jsx'

function Harness({ onChange }) {
  const [value, setValue] = useState('')
  return (
    <>
      <BirthDateField
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
      <output aria-label="valeur">{value}</output>
    </>
  )
}

describe('BirthDateField (US-110 CA-04)', () => {
  it('trois cases Jour / Mois / Année, au clavier numérique, sous « Date de naissance »', () => {
    render(<Harness onChange={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Date de naissance' })
    for (const label of ['Jour', 'Mois', 'Année']) {
      expect(within(group).getByLabelText(label)).toHaveAttribute('inputmode', 'numeric')
    }
  })

  it('une date complète et valide donne la date au format du serveur (AAAA-MM-JJ)', async () => {
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)
    await user.type(screen.getByLabelText('Jour'), '15')
    await user.type(screen.getByLabelText('Mois'), '3')
    await user.type(screen.getByLabelText('Année'), '1996')
    expect(screen.getByLabelText('valeur')).toHaveTextContent('1996-03-15')
  })

  it('deux chiffres dans « Jour » passent au mois, deux dans « Mois » passent à l’année', async () => {
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)
    await user.type(screen.getByLabelText('Jour'), '05')
    expect(screen.getByLabelText('Mois')).toHaveFocus()
    await user.keyboard('11')
    expect(screen.getByLabelText('Année')).toHaveFocus()
  })

  it('une date incomplète ou impossible (31/02) ne donne aucune date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByLabelText('Jour'), '31')
    await user.type(screen.getByLabelText('Mois'), '02')
    await user.type(screen.getByLabelText('Année'), '1996')
    expect(screen.getByLabelText('valeur')).toHaveTextContent(/^$/)
    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/\d/))
  })

  it('seuls les chiffres sont gardés', async () => {
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)
    await user.type(screen.getByLabelText('Jour'), 'a1b')
    expect(screen.getByLabelText('Jour')).toHaveValue('1')
  })
})
