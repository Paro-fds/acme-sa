import { expect, test } from '@playwright/test'

/** US-02 T-02.8 : première connexion complète sur mobile (identification → création → profil). */
test('première connexion : création du mot de passe puis accès au profil', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('PIERRE')
  await page.getByLabel('Prénom').fill('Marie')
  await page.getByLabel('Date de naissance').fill('1990-07-02')
  await page.getByRole('button', { name: 'Continuer' }).click()

  await expect(page.getByRole('heading', { name: 'Créez votre mot de passe' })).toBeVisible()

  // Erreur de confirmation, corrigée ensuite
  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2027')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()
  await expect(page.getByText('Les deux mots de passe ne correspondent pas.')).toBeVisible()

  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()

  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByText('PIERRE Marie')).toBeVisible()

  // Le cookie de session n'est pas lisible par JavaScript
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === 'acme_session')?.httpOnly).toBe(true)
})
