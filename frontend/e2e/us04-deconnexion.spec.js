import { expect, test } from '@playwright/test'
import { createPassword, EMP_E } from './auth.js'

/** US-04 : déconnexion depuis le menu de l'avatar, sur mobile. */
test('déconnexion : message, retour arrière sans données', async ({ page }) => {
  // Première connexion (EMP-E, réservé à ce test), depuis l'accueil
  await page.goto('/')
  await createPassword(page, EMP_E)
  await expect(page.getByText('ÉTIENNE Rosé')).toBeVisible()

  // CA-01 : déconnexion
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('status')).toHaveText(/Vous êtes déconnecté\./)
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === 'acme_session')).toBeUndefined()

  // CA-03 : le retour arrière ne réaffiche pas le dossier
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Votre carrière commence par un dossier complet' })).toBeVisible()
  await expect(page.getByText('ÉTIENNE Rosé')).toHaveCount(0)

  // CA-02 : l'accès direct au profil renvoie aussi à l'identification
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible()
  await expect(page.getByText('ÉTIENNE Rosé')).toHaveCount(0)
})
