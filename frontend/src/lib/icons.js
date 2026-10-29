/**
 * US-109 : les icônes restent invisibles (case vide de 1em) jusqu'à l'arrivée de leur police,
 * pour que leur nom ne s'affiche jamais en texte ; `icons-ready` les révèle (voir index.css).
 */
export function revealIconsWhenReady(root = document.documentElement, fonts = document.fonts) {
  const reveal = () => root.classList.add('icons-ready')
  if (!fonts?.load) {
    reveal()
    return Promise.resolve()
  }
  return fonts.load('24px "Material Symbols Outlined"', 'home').then(reveal, () => {})
}
