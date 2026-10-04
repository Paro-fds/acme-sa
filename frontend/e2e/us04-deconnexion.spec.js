import { expect, test } from '@playwright/test'

/** US-04 : déconnexion depuis le menu de l'avatar, sur mobile. */
test('déconnexion : message, retour arrière sans données', async ({ page }) => {
  // Première connexion (EMP-E, réservé à ce test)
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('ÉTIENNE')
  await page.getByLabel('Prénom').fill('Rosé')
  await page.getByLabel('Date de naissance').fill('1979-09-30')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()
  await expect(page.getByText('ÉTIENNE Rosé')).toBeVisible()

  // CA-01 : déconnexion
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('status')).toHaveText(/Vous êtes déconnecté\./)
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === 'acme_session')).toBeUndefined()

  // CA-03 : le retour arrière ne réaffiche pas le dossier
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Accéder à mon dossier' })).toBeVisible()
  await expect(page.getByText('ÉTIENNE Rosé')).toHaveCount(0)

  // CA-02 : l'accès direct au profil renvoie aussi à l'identification
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Accéder à mon dossier' })).toBeVisible()
  await expect(page.getByText('ÉTIENNE Rosé')).toHaveCount(0)
})
