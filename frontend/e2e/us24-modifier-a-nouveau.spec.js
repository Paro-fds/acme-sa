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

/** Étapes 1 → 4 depuis l'étape 1, avec ce téléphone. */
async function sendWithPhone(page, phone) {
  await page.getByLabel('Téléphone').fill(phone)
  await page.getByRole('button', { name: 'Continuer vers les documents' }).click()
  await page.getByRole('button', { name: 'Continuer vers la vérification' }).click()
  await page.getByLabel(/Je confirme que les informations fournies sont exactes et sincères\./).check()
  await page.getByRole('button', { name: 'Soumettre ma mise à jour' }).click()
  await expect(page.getByRole('heading', { name: 'Votre mise à jour a bien été transmise' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour à mon profil' }).click()
  await expect(page.getByText('Effectuée', { exact: true })).toBeVisible()
}

async function adminFolderOfBaptiste(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const admin = await context.newPage()
  await admin.goto('/admin/connexion')
  await admin.getByLabel('Identifiant').fill('admin')
  await admin.getByLabel('Mot de passe', { exact: true }).fill('Admin-Test-2026')
  await admin.getByRole('button', { name: 'Se connecter' }).click()
  await expect(admin).toHaveURL(/\/admin$/)
  await admin.goto('/admin/employes/1008')
  return { admin, context }
}

/**
 * US-24 T-24.4 : EMP-B a envoyé (us12, ou ci-dessous s'il ne l'a pas fait) ; il modifie à nouveau,
 * l'administration voit toujours le dernier envoi, puis le nouvel envoi le remplace.
 */
test('modifier à nouveau : brouillon invisible pour l’admin, nouvel envoi visible', async ({ page, browser }) => {
  await signIn(page)
  if (await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).isVisible()) {
    await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).click()
    await sendWithPhone(page, '+509 3722 8888')
  }

  // CA-01, CA-02 : « Modifier à nouveau » → étape 1 avec les valeurs envoyées
  await expect(page.getByText(/^Mise à jour envoyée le /)).toBeVisible()
  await page.getByRole('button', { name: 'Modifier à nouveau' }).click()
  await expect(page).toHaveURL(/\/mise-a-jour\/informations$/)
  await expect(page.getByLabel('Téléphone')).toHaveValue('+509 3722 8888')
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/me/update/changes') && r.ok())
  await page.getByLabel('Téléphone').fill('+509 3722 9999')
  await saved // sauvegarde automatique du brouillon (2 s)

  // CA-03 : l'administration voit toujours le dernier envoi
  const { admin, context } = await adminFolderOfBaptiste(browser)
  const contact = admin.getByRole('region', { name: 'Coordonnées' })
  await expect(contact).toContainText('+509 3722 8888')
  await expect(admin.getByRole('main')).not.toContainText('+509 3722 9999')
  await expect(admin.getByRole('region', { name: 'Mise à jour' })).toContainText(/Mise à jour effectuée le/)

  // Le profil propose de reprendre ou d'annuler
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Vous modifiez votre dossier' })).toBeVisible()
  await page.getByRole('button', { name: 'Reprendre la modification' }).click()
  await expect(page.getByLabel('Téléphone')).toHaveValue('+509 3722 9999')

  // CA-04 : nouvel envoi → l'administration voit la nouvelle valeur
  await sendWithPhone(page, '+509 3722 9999')
  await expect(page.getByText('+509 3722 9999')).toBeVisible()
  await admin.reload()
  await expect(contact).toContainText('+509 3722 9999')
  await expect(admin.getByRole('region', { name: 'Mise à jour' })).toContainText('+509 3722 9999')
  await context.close()
})
