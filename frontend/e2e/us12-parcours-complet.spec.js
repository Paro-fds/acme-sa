import { expect, test } from '@playwright/test'

const PASSWORD = 'Bonjour-2026'

/** Connexion d'EMP-B (BAPTISTE Marc) : création du mot de passe ou saisie s'il existe déjà. */
async function signIn(page) {
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('BAPTISTE')
  await page.getByLabel('Prénom').fill('Marc')
  await page.getByLabel('Date de naissance').fill('2000-12-01')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
  const confirmation = page.getByLabel('Confirmer le mot de passe', { exact: true })
  if (await confirmation.isVisible()) {
    await confirmation.fill(PASSWORD)
    await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()
  } else {
    await page.getByRole('button', { name: 'Se connecter' }).click()
  }
  await expect(page).toHaveURL(/\/profil$/)
}

/**
 * US-12 T-12.6 : identification → Oui → 2 modifications → vérification → soumission → profil « Effectuée ».
 * L'étape « document » sera ajoutée avec US-13 (API des documents).
 */
test('parcours complet : modification, vérification, soumission puis verrouillage', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).click()

  await page.getByLabel('Téléphone').fill('+509 3722 8888')
  await page.getByLabel('Adresse').fill('8 rue Lamarre, Cap-Haïtien')
  await page.getByRole('button', { name: 'Continuer vers la vérification' }).click()

  await expect(page.getByText('2 modifications en attente')).toBeVisible()
  await expect(page.getByText('8 rue Lamarre, Cap-Haïtien')).toBeVisible()
  await expect(page.getByText('Aucun document joint (optionnel)')).toBeVisible()

  const submit = page.getByRole('button', { name: 'Soumettre ma mise à jour' })
  await expect(submit).toBeDisabled()
  await page.getByLabel(/Je confirme que les informations fournies sont exactes et sincères\./).check()
  await submit.dblclick()

  await expect(page.getByRole('heading', { name: 'Votre mise à jour a bien été transmise' })).toBeVisible()
  await expect(page.getByText('Étape 4 sur 4 : Confirmation')).toBeVisible()
  await expect(page.getByText('2 informations')).toBeVisible()

  await page.getByRole('button', { name: 'Retour à mon profil' }).click()
  await expect(page.getByText('Effectuée', { exact: true })).toBeVisible()
  await expect(page.getByText('+509 3722 8888')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' })).toHaveCount(0)

  // CA-04 : les écrans de modification renvoient au profil
  for (const path of ['/mise-a-jour/informations', '/mise-a-jour/verification']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/profil$/)
  }
})
