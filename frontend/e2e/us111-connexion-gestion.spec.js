import { expect, test } from '@playwright/test'
import { ADMIN_PASSWORD } from './admin.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/**
 * US-111 : connexion de l'espace de gestion, sur ordinateur et téléphone.
 * US-112 : double authentification coupée (réglage par défaut) : un seul écran, le mot de passe ouvre l'espace.
 */
for (const [label, viewport] of [
  ['1280', { width: 1280, height: 860 }],
  ['390', { width: 390, height: 844 }],
]) {
  test(`connexion de l'espace de gestion (${label} px) : un seul écran, sans code`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/admin/connexion')
    await expect(page.getByText('Espace de gestion')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible()
    await expect(page.getByText(/Étape \d sur 2/)).toHaveCount(0)
    await expect(page.getByText(/code à 6 chiffres/)).toHaveCount(0)
    await expect(page.getByText('Démonstration · données fictives')).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.screenshot({ path: `${CAPTURES}/us112-connexion-${label}.png`, fullPage: true })

    await page.getByLabel('Identifiant').fill('admin')
    await page.getByLabel('Mot de passe', { exact: true }).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/admin(\/mot-de-passe)?$/)
    await expect(page.getByLabel('Code de vérification')).toHaveCount(0)

    // Le menu du compte ne propose plus « Ma double authentification »
    await page.getByRole('button', { name: 'Menu du compte' }).click()
    await expect(page.getByRole('menuitem', { name: 'Se déconnecter' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Ma double authentification' })).toHaveCount(0)
  })
}
