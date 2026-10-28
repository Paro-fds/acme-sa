import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PublicHeader from './PublicHeader.jsx'

describe('PublicHeader (US-1006)', () => {
  it('CA-01 : le nom affiché est PAM, avec son nom complet', () => {
    render(<PublicHeader />)

    expect(screen.getByText('PAM')).toHaveAttribute('title', 'Plateforme ACME Multifonction')
    expect(screen.queryByText(/Portail Carrière/)).not.toBeInTheDocument()
  })
})
