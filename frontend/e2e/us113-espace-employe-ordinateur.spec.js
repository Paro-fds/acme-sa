import { expect, test } from '@playwright/test'
import { EMP_H2, acceptConsent, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const PAGES = [
  ['accueil', '/accueil', 'Accueil'],
  ['dossier', '/profil', 'Mon dossier'],
  ['coordonnees', '/profil/coordonnees', 'Mon dossier'],
  ['certificats', '/certificats', 'Mes certificats'],
  ['carriere', '/carriere', 'Ma carrière'],
]

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/**
 * US-113 : espace employé sur ordinateur (menu à gauche, colonne de droite) et sur téléphone (barre du bas, bouton ☰),
 * sans La Penseuse ; initiales à la place de la photo tant que la source des photos n'est pas branchée.
 */
test('espace employé : menu à gauche sur ordinateur, bouton menu sur téléphone', async ({ page }) => {
  test.setTimeout(120000)
  await signIn(page, EMP_H2)
  await page.goto('/accueil')
  if (await page.waitForURL(/avant-de-commencer/, { timeout: 3000 }).then(() => true, () => false)) await acceptConsent(page)

  await page.setViewportSize({ width: 1280, height: 860 })
  for (const [name, path, active] of PAGES) {
    await page.goto(path)
    const side = page.getByRole('navigation', { name: 'Espace employé' })
    await expect(side.getByRole('link', { name: new RegExp(active) })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
    await expect(page.getByText(/Penseuse/)).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${CAPTURES}/us113-${name}-1280.png`, fullPage: true })
  }
  await expect(page.getByText('Marie PIERRE')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/profil')
  const bottom = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(bottom.getByRole('link', { name: /Mon dossier/ })).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
  await page.screenshot({ path: `${CAPTURES}/us113-dossier-390.png`, fullPage: true })

  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  const drawer = page.getByRole('dialog', { name: 'Menu' })
  await expect(drawer.getByRole('link', { name: /Ma carrière/ })).toBeVisible()
  await expect(drawer.getByRole('link', { name: /Mon parcours/ })).toHaveCount(0)
  await page.screenshot({ path: `${CAPTURES}/us113-menu-390.png` })
  await drawer.getByRole('link', { name: /Ma carrière/ }).click()
  await expect(page).toHaveURL(/\/carriere$/)
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0)
})
