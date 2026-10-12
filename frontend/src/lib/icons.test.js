// @vitest-environment node
import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { usedIconNames } from '../../scripts/icon-names.mjs'
import icons from './icons.json'
import { revealIconsWhenReady } from './icons.js'

const FONT = new URL('../../public/fonts/material-symbols.woff2', import.meta.url)
const INDEX_HTML = new URL('../../index.html', import.meta.url)
const CSS = new URL('../index.css', import.meta.url)

describe('US-109 — icônes chargées sans texte parasite', () => {
  it('CA-03 : chaque icône affichée par un écran est dans la police du portail (sinon : npm run icons)', () => {
    const missing = usedIconNames().filter((name) => !icons.includes(name))
    expect(missing).toEqual([])
  })

  it('CA-02 : la police ne contient que les icônes du portail (quelques dizaines de Ko, pas 4 Mo)', () => {
    expect(existsSync(FONT)).toBe(true)
    expect(statSync(FONT).size).toBeLessThan(200 * 1024)
  })

  it('CA-02 : la police est préchargée dès l’ouverture de la page', () => {
    expect(readFileSync(INDEX_HTML, 'utf8')).toMatch(
      /<link rel="preload" href="\/fonts\/material-symbols\.woff2" as="font" type="font\/woff2" crossorigin \/>/,
    )
  })

  it('CA-01 : en attendant la police, le nom de l’icône ne s’affiche jamais (case de 1em, texte masqué)', () => {
    const css = readFileSync(CSS, 'utf8')
    expect(css).toMatch(/font-display: block/)
    expect(css).toMatch(/\.material-symbols-outlined\s*\{[^}]*width: 1em;[^}]*overflow: hidden;/s)
    expect(css).toMatch(/html:not\(\.icons-ready\) \.material-symbols-outlined\s*\{\s*color: transparent;/)
  })

  it('CA-01 : les icônes sont révélées quand leur police est arrivée, jamais avant', async () => {
    const root = { classList: new Set(), add: null }
    root.classList.add = root.classList.add.bind(root.classList)
    let arrive
    const fonts = { load: () => new Promise((resolve) => (arrive = resolve)) }
    const done = revealIconsWhenReady(root, fonts)
    expect(root.classList.has('icons-ready')).toBe(false)
    arrive([])
    await done
    expect(root.classList.has('icons-ready')).toBe(true)
  })
})
