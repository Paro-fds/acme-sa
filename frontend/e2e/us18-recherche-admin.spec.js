import { expect, test } from '@playwright/test'

/** US-18 : recherche sur mobile (390 px), barre collante. */
test('recherche admin : barre collante, résultats, aucun résultat, effacer', async ({ page }) => {
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill('admin')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Admin-Test-2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/employes')
  await expect(page.getByText('7 employés')).toBeVisible()

  // CA-10 : pleine largeur et toujours visible en haut lors du défilement
  const search = page.getByRole('searchbox', { name: 'Rechercher un employé' })
  const bar = await page.getByRole('search').boundingBox()
  expect(bar.width).toBe(390)
  await page.mouse.wheel(0, 2000)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200)
  await expect(search).toBeInViewport()
  const top = (await page.getByRole('search').boundingBox()).y
  expect(top).toBeGreaterThanOrEqual(60)
  expect(top).toBeLessThan(80)

  // CA-01 : recherche par nom
  await search.fill('pierre')
  await expect(page.getByText('2 employés')).toBeVisible()
  await expect(page).toHaveURL(/\?search=pierre$/)
  const cards = page.getByRole('list', { name: 'Employés' }).getByRole('listitem')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('PIERRE Marie')

  // CA-07 puis CA-08
  await search.fill('zzz')
  await expect(page.getByText('Aucun employé ne correspond à votre recherche.')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  await expect(page.getByText('7 employés')).toBeVisible()
  await expect(search).toHaveValue('')

  // Rechargement : le terme de l'adresse est repris
  await page.goto('/admin/employes?search=jean%20joseph')
  await expect(search).toHaveValue('jean joseph')
  await expect(page.getByText('1 employé', { exact: true })).toBeVisible()
})
