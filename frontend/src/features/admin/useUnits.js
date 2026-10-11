import { useEffect, useState } from 'react'
import { getReferential } from '../../api/referential.js'

const EMPTY = { agencies: [], regions: [], directions: [] }

/**
 * US-108 : agences, régions et directions du référentiel officiel, pour les filtres des écrans RH (A03, A06).
 * Jamais une liste écrite dans l'écran ; sans réponse de l'API, les filtres n'offrent que « Toutes ».
 */
export function useUnits() {
  const [units, setUnits] = useState(EMPTY)
  useEffect(() => {
    let active = true
    getReferential()
      .then((data) => {
        if (!active) return
        const ofType = (type) => data.units.filter((unit) => unit.type === type)
        setUnits({ agencies: ofType('AGENCE'), regions: ofType('REGION'), directions: ofType('DIRECTION') })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return units
}
