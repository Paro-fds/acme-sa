/** US-001 : environnement choisi à la compilation (`VITE_APP_ENV`), `demo` sur le démonstrateur. */
export function isDemo() {
  return import.meta.env.VITE_APP_ENV === 'demo'
}
