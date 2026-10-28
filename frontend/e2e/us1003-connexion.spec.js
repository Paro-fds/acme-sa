import { expect, test } from '@playwright/test'
import { acceptConsent, EMP_B, enterCode, identify, landed, resetLoginState } from './auth.js'

/**
 * US-1003 : connexion sur téléphone (390 px) avec le code employé, la date de naissance et un code reçu par
 * courriel ; sur le serveur des tests, le code s'affiche à l'écran au lieu de partir.
 */
test('connexion : date fausse, code faux, puis connexion réussie', async ({ page }) => {
  resetLoginState(EMP_B)

  // CA-01 : date fausse → message unique
  await identify(page, { ...EMP_B, birthDate: '2000-12-02' })
  await expect(page.getByRole('alert')).toHaveText(/Informations incorrectes\./)

  // CA-03 : courriel masqué, aucune adresse à saisir
  await identify(page, EMP_B)
  await expect(page.getByText('Étape 2 sur 3')).toBeVisible()
  await expect(page.getByText('m•••@exemple.test')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  // CA-04 : code faux → essais restants
  await page.getByRole('button', { name: 'Recevoir mon code par courriel' }).click()
  const shown = await page.getByRole('status').filter({ hasText: 'Code :' }).textContent()
  const code = shown.match(/\d{6}/)[0]
  await page.getByLabel('Code reçu').fill(code === '000000' ? '111111' : '000000')
  await page.getByRole('button', { name: 'Me connecter' }).click()
  await expect(page.getByRole('alert')).toContainText('Code incorrect ou expiré.') // US-1016
  await expect(page.getByRole('button', { name: /Renvoyer le code \(\d\d:\d\d\)/ })).toBeDisabled()

  // CA-06 : bon code → l'espace employé s'ouvre
  await page.getByLabel('Code reçu').fill(code)
  await page.getByRole('button', { name: 'Me connecter' }).click()
  await landed(page)
  if (page.url().endsWith('/avant-de-commencer')) await acceptConsent(page)
  await expect(page.getByRole('heading', { name: 'Bonjour Marc' })).toBeVisible()
})

test('connexion : un code inconnu reçoit le même message', async ({ page }) => {
  await identify(page, { code: 'AC-9999', birthDate: '1990-01-01' })

  await expect(page.getByRole('alert')).toHaveText(/Informations incorrectes\./)
})

test('connexion : les anciennes adresses du mot de passe ramènent à la connexion', async ({ page }) => {
  await page.goto('/connexion/premiere')

  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByLabel('Code employé')).toBeVisible()
})

test('connexion : enterCode lit le code affiché sur le poste local', async ({ page }) => {
  resetLoginState(EMP_B)
  await identify(page, EMP_B)

  expect(await enterCode(page)).toMatch(/^\d{6}$/)
  await landed(page)
})
