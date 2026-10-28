import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// findBy… et waitFor attendent 1 s par défaut : trop court pour le premier rendu d'un fichier quand toute la suite
// tourne en parallèle (échecs intermittents des cloches US-116 et US-120). Reste bien en dessous de testTimeout.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
