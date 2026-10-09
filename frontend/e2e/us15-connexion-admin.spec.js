import { expect, test } from '@playwright/test'
import { passSecondFactor } from './admin.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

/**
 * US-15 : connexion et déconnexion admin, sur mobile.
 * Une seule erreur de mot de passe : le blocage (5 erreurs) est vérifié par les tests API,
 * pour ne pas bloquer le compte admin partagé par les autres tests E2E.
 */
test('connexion admin : refus, accès, déconnexion, routes protégées', async ({ page }) => {
  // CA-05 : sans session, l'espace admin renvoie à la connexion
  await page.goto('/admin/employes')
  await expect(page).toHaveURL(/\/admin\/connexion$/)

  // US-107 : écran A01, à 390 px et à 1280 px, sans défilement horizontal
  await expect(page.getByRole('heading', { level: 1, name: 'Espace RH' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us107-connexion-rh-390.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us107-connexion-rh-1280.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })

  // CA-02 : identifiants incorrects
  await page.getByLabel('Identifiant').fill('admin')
  await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByRole('alert')).toHaveText(/Identifiant ou mot de passe incorrect\./)

  // CA-01 : connexion → tableau de bord (US-16)
  await page.getByLabel('Mot de passe', { exact: true }).fill('Admin-Test-2026')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await passSecondFactor(page) // US-102
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Suivi de la campagne' })).toBeVisible()
  await page.getByRole('link', { name: 'Voir la liste des employés' }).click()
  await expect(page).toHaveURL(/\/admin\/employes$/)
  await expect(page.getByText(/^\d+ employés/)).toBeVisible()

  // CA-06 : déconnexion
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/admin\/connexion$/)
  await expect(page.getByRole('status')).toHaveText(/Vous êtes déconnecté\./)
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === 'acme_session')).toBeUndefined()

  // Après la déconnexion, l'accès direct à la liste renvoie à la connexion
  await page.goto('/admin/employes')
  await expect(page).toHaveURL(/\/admin\/connexion$/)
  await expect(page.getByText(/\d+ employés/)).toHaveCount(0)
})
