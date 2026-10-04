import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValueComparison from './ValueComparison.jsx'

describe('ValueComparison (US-11)', () => {
  it('CA-01 : affiche l’ancienne valeur barrée et la nouvelle mise en avant', () => {
    render(<ValueComparison label="Téléphone" oldValue="+50937221111" newValue="+509 3722 2222" />)

    expect(screen.getByRole('heading', { name: 'Téléphone' })).toBeInTheDocument()
    expect(screen.getByText('+50937221111').tagName).toBe('S')
    expect(screen.getByText('+509 3722 2222').tagName).toBe('STRONG')
    expect(screen.getByText('Ancienne :')).toBeInTheDocument()
    expect(screen.getByText('Nouvelle :')).toBeInTheDocument()
    expect(screen.getByText('Modifié')).toBeInTheDocument()
  })

  it('CA-06 : une ancienne valeur vide est affichée « Non renseigné »', () => {
    render(<ValueComparison label="Email" oldValue="" newValue="rose.etienne@exemple.test" />)

    expect(screen.getByText('Non renseigné')).toBeInTheDocument()
  })

  it('une nouvelle valeur vide (champ facultatif vidé) est affichée « Non renseigné »', () => {
    render(<ValueComparison label="Adresse" oldValue="12 rue Capois" newValue="" />)

    expect(screen.getByText('12 rue Capois').tagName).toBe('S')
    expect(screen.getByText('Non renseigné')).toBeInTheDocument()
  })
})
