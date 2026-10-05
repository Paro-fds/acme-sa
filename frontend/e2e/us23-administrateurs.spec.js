import { expect, test } from '@playwright/test'

const PROVISIONAL = 'Provisoire-E2E-2026'
const CHOSEN = 'Mon-mot-de-passe-E2E-2026'

async function login(page, username, password) {
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill(username)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

/**
 * US-23 T-23.5 : un administrateur en ajoute un autre ; à sa première connexion, le nouveau
 * choisit son mot de passe avant d'accéder au tableau de bord. Compte de test : e2e.marie.
 */
test('administrateurs : ajout, mot de passe provisoire puis choisi', async ({ page }) => {
  await login(page, 'admin', 'Admin-Test-2026')
  await expect(page).toHaveURL(/\/admin$/)

  // CA-04, CA-05 : écran « Administrateurs » depuis le menu du compte, ajout
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Administrateurs' }).click()
  await expect(page).toHaveURL(/\/admin\/administrateurs$/)
  const list = page.getByRole('list', { name: 'Comptes administrateurs' })
  await expect(list.getByRole('listitem').filter({ hasText: 'admin' }).first()).toContainText('Vous')

  await page.getByLabel('Identifiant').fill('e2e.marie')
  await page.getByLabel('Mot de passe provisoire', { exact: true }).fill(PROVISIONAL)
  await page.getByRole('button', { name: "Ajouter l'administrateur" }).click()
  await expect(page.getByText(/Administrateur « e2e\.marie » ajouté/)).toBeVisible()
  const marie = list.getByRole('listitem').filter({ hasText: 'e2e.marie' })
  await expect(marie).toContainText('Mot de passe provisoire')
  await expect(marie).toContainText('Jamais connecté')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/admin\/connexion$/)

  // CA-07 : première connexion → choix du mot de passe, le tableau de bord reste fermé
  await login(page, 'e2e.marie', PROVISIONAL)
  await expect(page).toHaveURL(/\/admin\/mot-de-passe$/)
  await expect(page.getByRole('heading', { name: 'Choisissez votre mot de passe' })).toBeVisible()
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/mot-de-passe$/)

  await page.getByLabel('Mot de passe provisoire', { exact: true }).fill(PROVISIONAL)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(CHOSEN)
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill(CHOSEN)
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Suivi de la campagne' })).toBeVisible()

  // Le provisoire ne fonctionne plus, le nouveau oui
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await login(page, 'e2e.marie', PROVISIONAL)
  await expect(page.getByRole('alert')).toHaveText(/Identifiant ou mot de passe incorrect\./)
  await login(page, 'e2e.marie', CHOSEN)
  await expect(page).toHaveURL(/\/admin$/)
})
