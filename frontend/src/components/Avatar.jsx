import { useState } from 'react'
import { initials } from '../lib/format.js'

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
  xl: 'size-28 text-3xl',
}

/**
 * US-113 : photo officielle de l'employé (système RH), sinon ses initiales, à la même place et à la même taille :
 * rien ne bouge quand la photo arrive. Une photo qui ne charge pas laisse aussi place aux initiales.
 */
export default function Avatar({ firstName, lastName, photoUrl, size = 'md', ring = false, className = '' }) {
  const [broken, setBroken] = useState(false)
  const frame = `${SIZES[size]} shrink-0 rounded-full ${ring ? 'ring-4 ring-surface outline outline-1 outline-border' : ''} ${className}`
  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt={`Photo de ${[firstName, lastName].filter(Boolean).join(' ')}`}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`${frame} bg-highlight object-cover object-top`}
      />
    )
  }
  return (
    <span aria-hidden="true" className={`${frame} flex items-center justify-center bg-primary font-bold text-white`}>
      {initials(lastName, firstName)}
    </span>
  )
}
