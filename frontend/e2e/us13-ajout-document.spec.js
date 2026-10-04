import { expect, test } from '@playwright/test'

const PASSWORD = 'Bonjour-2026'

/** Connexion d'EMP-E (ÉTIENNE Rosé) : création du mot de passe ou saisie s'il existe déjà. */
async function signIn(page) {
  await page.goto('/')
  await page.getByLabel('Nom', { exact: true }).fill('ÉTIENNE')
  await page.getByLabel('Prénom').fill('Rosé')
  await page.getByLabel('Date de naissance').fill('1979-09-30')
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

/** US-13 T-13.7 : ajout d'un PDF sur mobile ; un format refusé est signalé. */
test('ajout de documents : un PDF accepté, un format refusé', async ({ page }) => {
  await signIn(page)
  const resume = page.getByRole('button', { name: 'Reprendre la mise à jour' })
  if (await resume.isVisible()) await resume.click()
  else await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).click()
  await page.getByRole('button', { name: 'Continuer vers les documents' }).click()

  await expect(page.getByText('Étape 2 sur 4 : Documents')).toBeVisible()
  const fileInput = page.getByLabel('Choisir un fichier du téléphone')
  await expect(fileInput).toBeDisabled()

  // CA-01 : un diplôme PDF
  await page.locator('label', { hasText: 'Diplôme' }).click()
  await fileInput.setInputFiles({
    name: 'diplome-licence.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.concat([Buffer.from('%PDF-1.7 '), Buffer.alloc(100 * 1024, 'x')]),
  })
  const added = page.getByRole('region', { name: 'Documents ajoutés' })
  await expect(added).toContainText('diplome-licence.pdf')
  await expect(added).toContainText('Diplôme')
  await expect(added.getByRole('img', { name: 'PDF' })).toBeVisible()

  // CA-04 : un exécutable renommé en .pdf est refusé par le serveur
  await page.locator('label', { hasText: 'Autre' }).click()
  await fileInput.setInputFiles({ name: 'virus.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ\x90\x00 programme') })
  await expect(page.getByRole('alert')).toHaveText(/Format non accepté\. Utilisez un PDF, JPG ou PNG\./)
  await expect(added.getByRole('listitem')).toHaveCount(1)

  // Le document est retrouvé après rechargement
  await page.reload()
  await expect(page.getByRole('region', { name: 'Documents ajoutés' })).toContainText('diplome-licence.pdf')
})
