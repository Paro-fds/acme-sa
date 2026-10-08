/** US-001 CA-04 : environnement en ligne hors production (`VITE_APP_ENV` = `demo` ou `recette`, choisi à la compilation). */
export function isDemo() {
  return ['demo', 'recette'].includes(import.meta.env.VITE_APP_ENV)
}
