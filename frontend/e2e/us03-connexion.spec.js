import { expect, test } from '@playwright/test'

async function identify(page) {
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('BAPTISTE')
  await page.getByLabel('Prénom').fill('Marc')
  await page.getByLabel('Date de naissance').fill('2000-12-01')
  await page.getByRole('button', { name: 'Continuer' }).click()
}

/** US-03 T-03.9 : connexion avec un mot de passe existant, sur mobile. */
test('connexion : erreur de mot de passe puis connexion réussie', async ({ page }) => {
  // Première connexion : création du mot de passe
  await identify(page)
  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()
  await expect(page).toHaveURL(/\/profil$/)

  // Nouvelle visite (session perdue)
  await page.context().clearCookies()
  await identify(page)
  await expect(page.getByRole('heading', { name: 'Saisissez votre mot de passe' })).toBeVisible()

  await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mdp')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Mot de passe incorrect.')).toBeVisible()

  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByText('BAPTISTE Marc')).toBeVisible()
})
