import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

/** US-18 : recherche sur mobile (390 px) dans l'écran A06 (US-108), retour depuis un dossier (US-20). */
test('recherche admin : résultats, retour depuis le dossier, aucun résultat, effacer', async ({ page }) => {
  await adminLogin(page)
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/employes')
  await expect(page.getByText('7 employés actifs')).toBeVisible()

  // A06 : la recherche est en tête de la carte, sans défilement horizontal à 390 px
  const search = page.getByRole('searchbox', { name: 'Rechercher un employé' })
  await expect(search).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  // CA-01 : recherche par nom
  await search.fill('pierre')
  await expect(page.getByText('2 employés')).toBeVisible()
  await expect(page).toHaveURL(/\?search=pierre$/)
  const cards = page.getByRole('list', { name: 'Employés' }).getByRole('listitem')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('Marie PIERRE')

  // CA-11 : ouvrir un résultat (US-20) puis revenir en arrière → même recherche
  await cards.first().getByRole('link').click()
  await expect(page).toHaveURL(/\/admin\/employes\/1002$/)
  await expect(page.getByRole('heading', { level: 1, name: /PIERRE Marie/ })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\?search=pierre$/)
  await expect(search).toHaveValue('pierre')
  await expect(page.getByText('2 employés')).toBeVisible()
  // Même chose avec le lien « Employés » du dossier
  await cards.nth(1).getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1, name: /PIERRE Marie/ })).toBeVisible()
  await page.getByRole('link', { name: 'Retour à la liste des employés' }).click()
  await expect(page).toHaveURL(/\?search=pierre$/)
  await expect(page.getByText('2 employés')).toBeVisible()

  // CA-07 puis CA-08
  await search.fill('zzz')
  await expect(page.getByText('Aucun employé ne correspond à votre recherche.')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  await expect(page.getByText('7 employés actifs')).toBeVisible()
  await expect(search).toHaveValue('')

  // Rechargement : le terme de l'adresse est repris
  await page.goto('/admin/employes?search=jean%20joseph')
  await expect(search).toHaveValue('jean joseph')
  await expect(page.getByText('1 employé', { exact: true })).toBeVisible()
})
