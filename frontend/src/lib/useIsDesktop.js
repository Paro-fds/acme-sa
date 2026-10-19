import { useSyncExternalStore } from 'react'

/** US-113 : largeur « ordinateur » (Tailwind `lg`) ; au-dessous, la mise en page du téléphone. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

function media() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null
}

function subscribe(onChange) {
  const query = media()
  if (!query) return () => {}
  query.addEventListener?.('change', onChange)
  return () => query.removeEventListener?.('change', onChange)
}

/**
 * Vrai sur un écran d'ordinateur. Sert à placer un bloc (progression, aide) dans la colonne de droite
 * sans le dupliquer : sur téléphone, il reste à sa place dans la page.
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => Boolean(media()?.matches), () => false)
}
