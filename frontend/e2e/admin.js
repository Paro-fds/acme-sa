import { expect } from '@playwright/test'

/**
 * US-102 : après le mot de passe RH, la double authentification.
 * Le serveur E2E tourne hors production : le code « envoyé » s'affiche dans la boîte de démonstration.
 */

export const ADMIN_PASSWORD = 'Admin-Test-2026'

/** Lit le code de la boîte de démonstration, le saisit et valide. */
export async function enterDemoCode(page, submitLabel) {
  const box = page.getByRole('complementary', { name: 'Boîte de démonstration' })
  await expect(box).toBeVisible()
  const code = (await box.innerText()).match(/(\d{3}) (\d{3})/).slice(1).join('')
  await page.getByLabel('Code de vérification').fill(code)
  await page.getByRole('button', { name: submitLabel }).click()
}

/** Première connexion : méthode « Email » ; connexions suivantes : le code de la méthode enregistrée. */
export async function passSecondFactor(page, email = 'rh.e2e@exemple.test') {
  const setup = page.getByRole('heading', { name: 'Protégez votre compte' })
  const verify = page.getByRole('heading', { name: 'Double authentification' })
  await expect(setup.or(verify)).toBeVisible()
  if (await setup.isVisible()) {
    await page.getByRole('radio', { name: /Email/ }).check()
    await page.getByLabel('Adresse email').fill(email)
    await page.getByRole('button', { name: 'Recevoir un code' }).click()
    await enterDemoCode(page, 'Activer la double authentification')
  } else {
    await enterDemoCode(page, 'Me connecter')
  }
}

/** Connexion RH complète : identifiant, mot de passe, puis le second facteur. */
export async function adminLogin(page, username = 'admin', password = ADMIN_PASSWORD) {
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill(username)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await passSecondFactor(page)
  await expect(page).toHaveURL(/\/admin(\/mot-de-passe)?$/)
}
