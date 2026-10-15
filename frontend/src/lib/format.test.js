import { describe, expect, it } from 'vitest'
import { formatMonth } from './format.js'

describe('formatMonth (V2, D-07)', () => {
  it('« AAAA-MM » → mois en toutes lettres et année', () => {
    expect(formatMonth('2021-06')).toBe('juin 2021')
    expect(formatMonth('2027-03')).toBe('mars 2027')
    expect(formatMonth('2016-01')).toBe('janvier 2016')
    expect(formatMonth('2019-12')).toBe('décembre 2019')
  })

  it('forme courte pour les listes chargées (« janv. 2016 »)', () => {
    expect(formatMonth('2016-01', { short: true })).toBe('janv. 2016')
    expect(formatMonth('2019-12', { short: true })).toBe('déc. 2019')
    expect(formatMonth('2021-06', { short: true })).toBe('juin 2021')
  })

  it('valeur vide ou invalide → chaîne vide', () => {
    expect(formatMonth(null)).toBe('')
    expect(formatMonth('')).toBe('')
    expect(formatMonth('2021-13')).toBe('')
  })
})
