import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H2, acceptConsent, signIn } from './auth.js'

const EMPLOYEE_NOTICE = 'Session fermée après 5 minutes sans action.' // US-1017 : modèle du directeur
const ADMIN_NOTICE = 'Session fermée après 15 minutes sans action.'

/** US-125, US-1017 : l'horloge du navigateur est simulée ; 5 minutes sans action ramènent l'employé à la connexion. */
test("employé : 5 minutes sans action ramènent à la connexion, l'activité l'évite", async ({ page }) => {
  await page.clock.install()
  await signIn(page, EMP_H2)
  await page.goto('/accueil')
  if (await page.waitForURL(/avant-de-commencer/, { timeout: 3000 }).then(() => true, () => false)) await acceptConsent(page)

  await page.clock.runFor('04:00')
  await page.mouse.wheel(0, 200)
  await page.keyboard.press('Tab')
  await page.clock.runFor('04:00')
  await expect(page).toHaveURL(/\/accueil$/)

  await page.clock.runFor('06:00')
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByText(EMPLOYEE_NOTICE)).toBeVisible()
  // La session est bien fermée : une page connectée renvoie à la connexion.
  await page.goto('/accueil')
  await expect(page).toHaveURL(/\/connexion$/)
})

test('espace de gestion : 15 minutes sans activité ramènent à sa connexion', async ({ page }) => {
  await page.clock.install()
  await adminLogin(page)
  await page.goto('/admin/postes')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.clock.runFor('16:00')
  await expect(page).toHaveURL(/\/admin\/connexion$/)
  await expect(page.getByText(ADMIN_NOTICE)).toBeVisible()
})
