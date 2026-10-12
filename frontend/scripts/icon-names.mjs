/**
 * US-109 : quelles icônes Material Symbols le portail affiche-t-il ?
 * Un nom d'icône est un mot entre guillemets ou entre deux balises (`>login<`) qui figure dans la liste
 * complète des icônes ; en prendre un de trop ne coûte que quelques octets, en oublier un afficherait du texte.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = fileURLToPath(new URL('..', import.meta.url))

/** Toutes les icônes Material Symbols, lues dans les types du paquet `material-symbols`. */
export function allIconNames() {
  const types = readFileSync(join(FRONTEND, 'node_modules/material-symbols/index.d.ts'), 'utf8')
  return new Set([...types.matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]))
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : []
  })
}

/**
 * Noms écrits dans une icône (`<span className="material-symbols-outlined …">nom</span>`, ou `icon: 'nom'`)
 * qui ne figurent pas dans la liste actuelle de Material Symbols : ils ne seraient pas dans la police
 * et s'afficheraient en texte (le « E » de `expand_more`, ancien nom). Renvoie « nom (fichier) ».
 */
export function unknownIconNames(all = allIconNames()) {
  const unknown = new Set()
  for (const file of sourceFiles(join(FRONTEND, 'src'))) {
    const text = readFileSync(file, 'utf8')
    const written = [
      ...text.matchAll(/material-symbols-outlined[^>]*>([a-z0-9_]+)</g),
      ...text.matchAll(/icon[:=]\s*['"]([a-z0-9_]+)['"]/g),
    ]
    for (const match of written) {
      if (!all.has(match[1])) unknown.add(`${match[1]} (${file.slice(FRONTEND.length)})`)
    }
  }
  return [...unknown].sort()
}

/** Les icônes utilisées par les écrans (`src/`, sans les tests), triées. */
export function usedIconNames(all = allIconNames()) {
  const used = new Set()
  for (const file of sourceFiles(join(FRONTEND, 'src'))) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/['"`>]([a-z0-9_]+)['"`<]/g)) {
      if (all.has(match[1])) used.add(match[1])
    }
  }
  return [...used].sort()
}
