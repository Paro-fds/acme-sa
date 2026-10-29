/**
 * US-109 : `npm run icons` — fabrique la police d'icônes du portail, réduite aux icônes qu'il affiche.
 * À relancer après avoir ajouté une icône dans un écran (le test `icons.test.js` le rappelle).
 * Écrit `public/fonts/material-symbols.woff2` et la liste `src/lib/icons.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { usedIconNames } from './icon-names.mjs'

const FRONTEND = fileURLToPath(new URL('..', import.meta.url))
// Un navigateur récent : Google Fonts répond alors en woff2.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const names = usedIconNames()
const css = await fetch(
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${names.join(',')}&display=block`,
  { headers: { 'User-Agent': USER_AGENT } },
).then((response) => response.text())
const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1]
if (!url) throw new Error(`Réponse inattendue de Google Fonts :\n${css}`)

const font = Buffer.from(await fetch(url).then((response) => response.arrayBuffer()))
mkdirSync(join(FRONTEND, 'public/fonts'), { recursive: true })
writeFileSync(join(FRONTEND, 'public/fonts/material-symbols.woff2'), font)
writeFileSync(join(FRONTEND, 'src/lib/icons.json'), `${JSON.stringify(names, null, 2)}\n`)
console.log(`${names.length} icônes, police de ${Math.round(font.length / 1024)} Ko.`)
