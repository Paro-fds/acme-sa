import { expect, test } from '@playwright/test'
import { createPassword, EMP_B, login } from './auth.js'

const GENERIC = 'Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe.'

/** US-03 → US-101 : connexion en un seul écran, avec un mot de passe existant, sur mobile. */
test('connexion : erreur de mot de passe puis connexion réussie', async ({ page }) => {
  // Première connexion : création du mot de passe
  await createPassword(page, EMP_B)
  await expect(page).toHaveURL(/\/profil$/)

  // Nouvelle visite (session perdue) : un seul écran
  await page.context().clearCookies()
  await login(page, EMP_B, 'mauvais-mdp')
  await expect(page.getByRole('alert')).toContainText('Vérification demandée')
  await expect(page.getByRole('alert')).toContainText(GENERIC)
  await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveValue('')

  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Me connecter' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByText('BAPTISTE Marc')).toBeVisible()
})

/** US-101 CA-03 : une personne inconnue reçoit le même message qu'un mot de passe faux. */
test('connexion : une personne inconnue reçoit le même message', async ({ page }) => {
  await login(page, { lastName: 'INCONNU', firstName: 'Personne', birthDate: '1990-01-01' }, 'Bonjour-2026')

  await expect(page.getByRole('alert')).toContainText(GENERIC)
})
