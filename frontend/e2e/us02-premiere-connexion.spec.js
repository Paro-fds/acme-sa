import { expect, test } from '@playwright/test'
import { acceptConsent, createPassword, EMP_H1 } from './auth.js'

/** US-02 → US-101 : première connexion complète sur mobile (création du mot de passe → profil). */
test('première connexion : création du mot de passe puis accès au profil', async ({ page }) => {
  // Depuis l'écran de connexion, le lien mène à la création du mot de passe
  await page.goto('/connexion')
  await page.getByRole('link', { name: 'Première connexion ? Créer mon mot de passe' }).click()
  await expect(page.getByRole('heading', { name: 'Première connexion' })).toBeVisible()

  // Erreur de confirmation, corrigée ensuite
  await createPassword(page, EMP_H1, 'Bonjour-2026', 'Bonjour-2027')
  await expect(page.getByText('Les deux mots de passe ne correspondent pas.')).toBeVisible()

  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()

  // US-207 : première connexion → « Avant de commencer », puis l'accueil.
  await expect(page).toHaveURL(/\/avant-de-commencer$/)
  await acceptConsent(page)
  await expect(page.getByRole('heading', { name: 'Bonjour Marie' })).toBeVisible()

  // Le cookie de session n'est pas lisible par JavaScript
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === 'acme_session')?.httpOnly).toBe(true)
})
