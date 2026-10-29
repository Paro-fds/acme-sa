import { describe, expect, it } from 'vitest'
import { searchProfiles } from './catalogueSearch.js'

const titles = (profiles) => profiles.map((profile) => profile.title)
const of = (...names) => names.map((title) => ({ title }))

const CATALOGUE = of(
  'Assistant directeur administratif',
  'Assistant directeur comptable',
  'Directeur crédit',
  'Agent de codirection fictif',
  'Directeur administratif',
  'Sous-directeur des opérations',
  'Comptable',
)

describe('US-126 CA-01 — les intitulés qui commencent par la recherche d’abord', () => {
  it('« directeur » : les directeurs, puis les assistants, puis le reste', () => {
    expect(titles(searchProfiles(CATALOGUE, 'directeur'))).toEqual([
      'Directeur administratif',
      'Directeur crédit',
      'Assistant directeur administratif',
      'Assistant directeur comptable',
      'Sous-directeur des opérations',
    ])
  })

  it('« direct » : un intitulé qui contient le mot au milieu d’un mot vient en dernier', () => {
    expect(titles(searchProfiles(CATALOGUE, 'direct')).at(-1)).toBe('Agent de codirection fictif')
  })

  it('plusieurs mots : le deuxième groupe demande que chaque mot commence un mot de l’intitulé', () => {
    expect(titles(searchProfiles(CATALOGUE, 'directeur admin'))).toEqual([
      'Directeur administratif',
      'Assistant directeur administratif',
    ])
  })

  it('sans recherche, l’ordre reçu ne change pas', () => {
    expect(searchProfiles(CATALOGUE, '  ')).toEqual(CATALOGUE)
  })
})

describe('US-126 CA-02 — accents et majuscules ignorés', () => {
  it('« DIRECTEUR CREDIT » trouve « Directeur crédit »', () => {
    expect(titles(searchProfiles(CATALOGUE, 'DIRECTEUR CREDIT'))).toEqual(['Directeur crédit'])
  })

  it('un mot absent ne donne rien', () => {
    expect(searchProfiles(CATALOGUE, 'informatique')).toEqual([])
  })
})
