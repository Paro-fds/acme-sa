import { expect, test } from '@playwright/test'

/** US-17 CA-04 : cartes à 390 px, tableau à 1280 px. */
test('liste des employés : cartes sur mobile, tableau sur ordinateur', async ({ page }) => {
  await page.goto('/admin/connexion')
  await page.getByLabel('Identifiant').fill('admin')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Admin-Test-2026')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/employes')

  // 390 px : cartes
  await expect(page.getByText('7 employés')).toBeVisible()
  const cards = page.getByRole('list', { name: 'Employés' })
  await expect(cards).toBeVisible()
  await expect(cards.getByRole('listitem')).toHaveCount(7)
  await expect(page.getByRole('table', { name: 'Employés' })).toBeHidden()
  const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(await noHorizontalScroll()).toBe(true)

  // 1280 px : tableau
  await page.setViewportSize({ width: 1280, height: 800 })
  const table = page.getByRole('table', { name: 'Employés' })
  await expect(table).toBeVisible()
  await expect(table.getByRole('row')).toHaveCount(8)
  await expect(cards).toBeHidden()
  expect(await noHorizontalScroll()).toBe(true)
})
