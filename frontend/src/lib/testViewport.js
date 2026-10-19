/** US-113 : pour les tests (jsdom n'a pas de `matchMedia`) : simule un écran d'ordinateur ou de téléphone. */
export function setDesktop(desktop) {
  window.matchMedia = (query) => ({
    matches: desktop && query.includes('min-width'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}
