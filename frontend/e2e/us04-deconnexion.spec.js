import { expect, test } from '@playwright/test'
import { EMP_D1, signIn } from './auth.js'

/** US-04 : déconnexion depuis le menu de l'avatar, sur mobile. */
test('déconnexion : message, retour arrière sans données', async ({ page }) => {
  // Première connexion (EMP-D1, US-1003 : code reçu par courriel)
  await page.goto('/')
  await signIn(page, EMP_D1, { consent: false })
  // Sans accepter la mention : EMP-D1 la lira dans le test de US-202.
  await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toHaveCount(0)

  // CA-02 : l'accès direct au profil renvoie aussi à l'identification
  await page.goto('/profil')
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toHaveCount(0)
})
