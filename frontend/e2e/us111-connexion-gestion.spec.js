import { expect, test } from '@playwright/test'
import { ADMIN_PASSWORD } from './admin.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/** US-111 : connexion de l'espace de gestion, étape 1 puis étape 2, sur ordinateur et téléphone. */
for (const [label, viewport] of [
  ['1280', { width: 1280, height: 860 }],
  ['390', { width: 390, height: 844 }],
]) {
  test(`connexion de l'espace de gestion (${label} px) : deux étapes, chacune sur son écran`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/admin/connexion')
    await expect(page.getByText('Espace de gestion')).toBeVisible()
    await expect(page.getByText('Étape 1 sur 2')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.screenshot({ path: `${CAPTURES}/us111-etape1-${label}.png`, fullPage: true })

    await page.getByLabel('Identifiant').fill('admin')
    await page.getByLabel('Mot de passe', { exact: true }).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page.getByText('Étape 2 sur 2')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Vérification|Protégez votre compte/ })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.screenshot({ path: `${CAPTURES}/us111-etape2-${label}.png`, fullPage: true })
  })
}
