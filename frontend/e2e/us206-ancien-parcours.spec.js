import { expect, test } from '@playwright/test'
import { EMP_B, signIn } from './auth.js'

/** US-206 : l'ancien parcours du MVP n'existe plus côté employé ; ses adresses ramènent à « Mon profil ». */
test('les anciennes adresses ramènent à « Mon profil »', async ({ page }) => {
  await signIn(page, EMP_B)
  await expect(page.getByRole('button', { name: /mettre à jour mon dossier/ })).toHaveCount(0)

  for (const address of ['/mise-a-jour/informations', '/mise-a-jour/verification', '/documents']) {
    await page.goto(address)
    await expect(page).toHaveURL(/\/profil$/)
  }
})
