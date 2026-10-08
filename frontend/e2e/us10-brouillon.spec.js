import { expect, test } from '@playwright/test'
import { createPassword, EMP_H2, login } from './auth.js'

// EMP-H2 (PIERRE Marie, née le 20/11/1985), réservé à ce test.

/** US-10 T-10.3 : modifier → enregistrer → déconnexion → reconnexion → reprise, sur mobile. */
test('brouillon : sauvegarde automatique, enregistrement, reprise après reconnexion', async ({ page }) => {
  await createPassword(page, EMP_H2)
  await page.getByRole('button', { name: 'Oui, mettre à jour mon dossier' }).click()

  // CA-01 : sauvegarde automatique après 2 s
  const status = page.getByRole('status').filter({ hasText: 'Brouillon enregistré automatiquement à' })
  await page.getByLabel('Téléphone').fill('+509 3722 3333')
  const firstSave = page.waitForResponse((response) => response.url().endsWith('/api/me/update/changes'))
  expect((await firstSave).status()).toBe(200)
  await expect(status).toBeVisible()

  // CA-02 : sauvegarde manuelle puis retour au profil « En cours »
  await page.getByLabel('Adresse').fill('5 rue Pavée, Jacmel')
  await page.getByRole('button', { name: 'Enregistrer comme brouillon' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.getByText('En cours', { exact: true })).toBeVisible()

  // Déconnexion puis reconnexion
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page.getByText('Vous êtes déconnecté.')).toBeVisible()
  await login(page, EMP_H2)

  // CA-03 : reprise avec les deux modifications
  await page.getByRole('button', { name: 'Reprendre la mise à jour' }).click()
  await expect(page.getByLabel('Téléphone')).toHaveValue('+509 3722 3333')
  await expect(page.getByLabel('Adresse')).toHaveValue('5 rue Pavée, Jacmel')
  await expect(page.getByText('2 modifications en cours')).toBeVisible()
})
