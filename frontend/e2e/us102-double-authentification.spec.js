import { expect, test } from '@playwright/test'
import { adminLogin, enterLocalCode } from './admin.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const PASSWORD = 'Paul-Provisoire-E2E-2026'
const CHOSEN = 'Paul-Mot-de-passe-E2E-2026'

async function login(page, username, password) {
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill(username)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continuer' }).click()
}

async function logout(page) {
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/admin\/connexion$/)
}

/**
 * US-102 : le parcours de la double authentification d'un compte RH, sur mobile.
 * Compte de test : e2e.paul (créé par le test).
 */
test('double authentification : choix WhatsApp, connexion suivante, changement, téléphone perdu', async ({ page }) => {
  // Un compte RH crée e2e.paul
  await adminLogin(page)
  await page.goto('/admin/administrateurs')
  await page.getByLabel('Identifiant').fill('e2e.paul')
  await page.getByLabel('Mot de passe provisoire', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: "Ajouter l'administrateur" }).click()
  await expect(page.getByText(/Administrateur « e2e\.paul » ajouté/)).toBeVisible()
  await logout(page)

  // CA-01 : première connexion de Paul → choix de la méthode avant l'espace RH
  // US-107 : l'étape 2 s'ouvre sur la même carte, sans changer d'écran
  await login(page, 'e2e.paul', PASSWORD)
  await expect(page.getByRole('heading', { name: 'Protégez votre compte' })).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/connexion$/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/double-authentification$/) // l'espace RH reste fermé
  await page.getByRole('radio', { name: /WhatsApp/ }).check()
  await page.getByLabel('Numéro WhatsApp').fill('+509 3722 3333')
  await page.getByRole('button', { name: 'Recevoir un code' }).click()

  // CA-02 : code reçu (boîte de démonstration), puis le mot de passe provisoire à changer (US-23)
  await expect(page.getByRole('complementary', { name: 'Message non envoyé' })).toContainText('+509 •••• 3333')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await enterLocalCode(page, 'Activer la double authentification')
  await expect(page).toHaveURL(/\/admin\/mot-de-passe$/)
  await page.getByLabel('Mot de passe provisoire', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(CHOSEN)
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill(CHOSEN)
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await logout(page)

  // Connexion suivante : le code part vers WhatsApp ; un code faux est refusé
  await login(page, 'e2e.paul', CHOSEN)
  await expect(page.getByRole('heading', { name: /Vérification de sécurité/ })).toBeVisible()
  await expect(page.getByText('Saisissez le code à 6 chiffres envoyé par WhatsApp au +509 •••• 3333.')).toBeVisible()
  await page.getByLabel('Code de vérification').fill('482')
  await page.screenshot({ path: `${CAPTURES}/us107-code-390.png`, fullPage: true })
  await page.getByLabel('Code de vérification').fill('000000')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.')).toBeVisible()
  await page.getByRole('button', { name: 'Renvoyer le code' }).click()
  await expect(page.getByText(/le précédent ne fonctionne plus/)).toBeVisible()
  await enterLocalCode(page, 'Valider')
  await expect(page).toHaveURL(/\/admin$/)

  // CA-04 : changer de méthode depuis son compte, après confirmation avec WhatsApp
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Ma double authentification' }).click()
  await expect(page.getByText('WhatsApp · +509 •••• 3333')).toBeVisible()
  await page.getByRole('button', { name: 'Changer de méthode' }).click()
  await page.getByRole('button', { name: 'Recevoir un code par WhatsApp' }).click()
  await enterLocalCode(page, 'Confirmer')
  await page.getByRole('radio', { name: /Email/ }).check()
  await page.getByLabel('Adresse email').fill('paul.louis@exemple.test')
  await page.getByRole('button', { name: 'Recevoir un code' }).click()
  await enterLocalCode(page, 'Enregistrer la nouvelle méthode')
  await expect(page.getByText(/Nouvelle méthode enregistrée/)).toBeVisible()
  await expect(page.getByText('Email · p•••@exemple.test')).toBeVisible()
  await logout(page)

  // CA-05 : téléphone perdu → un autre compte RH réinitialise ; Paul choisit à nouveau
  await adminLogin(page)
  await page.goto('/admin/administrateurs')
  const paul = page.getByRole('listitem').filter({ hasText: 'e2e.paul' })
  await expect(paul).toContainText('Double authentification : Email')
  await paul.getByRole('button', { name: 'Réinitialiser la double authentification de e2e.paul' }).click()
  await paul.getByRole('button', { name: 'Réinitialiser', exact: true }).click()
  await expect(page.getByText('Double authentification de « e2e.paul » réinitialisée.')).toBeVisible()
  await expect(paul).toContainText('à choisir à la prochaine connexion')
  await logout(page)

  await login(page, 'e2e.paul', CHOSEN)
  await expect(page.getByRole('heading', { name: 'Protégez votre compte' })).toBeVisible()
})
