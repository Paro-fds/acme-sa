import { expect, test } from '@playwright/test'

/**
 * Walking Skeleton (docs/03-plan-implementation.md §4) :
 * un employé modifie son téléphone et soumet ; l'admin le voit « Mise à jour effectuée ».
 */
test('parcours complet employé → admin', async ({ page }) => {
  // Identification (US-01)
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('JOSEPH')
  await page.getByLabel('Prénom').fill('Jean')
  await page.getByLabel('Date de naissance').fill('1996-03-15')
  await page.getByRole('button', { name: 'Continuer' }).click()

  // Création du mot de passe (US-02)
  await expect(page.getByRole('heading', { name: 'Créez votre mot de passe' })).toBeVisible()
  await page.getByLabel('Mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill('Bonjour-2026')
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()

  // Profil et choix « Oui » (US-05, US-08)
  await expect(page.getByText('JOSEPH Jean')).toBeVisible()
  await expect(page.getByText('Non effectuée')).toBeVisible()
  await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).click()

  // Modification du téléphone (US-09)
  await page.getByLabel('Téléphone').fill('+509 3722 2222')
  await page.getByRole('button', { name: 'Continuer vers les documents' }).click()

  // Documents facultatifs (US-13)
  await page.getByRole('button', { name: 'Passer cette étape' }).click()

  // Vérification et soumission (US-11, US-12)
  await expect(page.getByText('+509 3722 2222')).toBeVisible()
  await expect(page.getByText('+50937221111')).toBeVisible()
  await page.getByLabel('Je confirme que les informations fournies sont exactes et sincères.').check()
  await page.getByRole('button', { name: 'Soumettre ma mise à jour' }).click()
  await expect(page.getByText('Votre mise à jour a bien été transmise')).toBeVisible()

  // Le profil affiche la nouvelle valeur et l'état « Effectuée »
  await page.getByRole('button', { name: 'Retour à mon profil' }).click()
  await expect(page.getByText('Effectuée', { exact: true })).toBeVisible()
  await expect(page.getByText('+509 3722 2222')).toBeVisible()

  // Admin : connexion, tableau de bord et liste (US-15, US-16, US-17)
  await page.context().clearCookies()
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill('admin')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Admin-Test-2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  // Base partagée entre les tests E2E : seuls le total (7 employés actifs) et une soumission au moins sont sûrs.
  await expect(page.getByRole('link', { name: /^Total : 7,/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Effectuées : [1-7],/ })).toBeVisible()
  await page.getByRole('link', { name: /^Non effectuées/ }).click()
  await expect(page).toHaveURL(/\/admin\/employes\?status=NOT_UPDATED$/)
  await page.goto('/admin/employes')

  const row = page.getByRole('listitem').filter({ hasText: 'JOSEPH Jean' })
  await expect(row.getByText('Mise à jour effectuée')).toBeVisible()
  // EMP-E ne soumet dans aucun test E2E (voir e2e/start-server.mjs).
  await expect(page.getByRole('listitem').filter({ hasText: 'ÉTIENNE Rosé' }).getByText('Mise à jour non effectuée')).toBeVisible()

  // Dossier en lecture seule (US-20) : le changement soumis est visible
  await row.getByRole('link').click()
  await expect(page.getByRole('heading', { name: 'JOSEPH Jean' })).toBeVisible()
  await expect(page.getByText(/^Mise à jour effectuée le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/)).toBeVisible()
  await expect(page.getByRole('article').filter({ hasText: 'Téléphone' })).toContainText('+509 3722 2222')
})
