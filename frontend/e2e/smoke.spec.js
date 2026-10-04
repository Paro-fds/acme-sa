import { expect, test } from '@playwright/test'

test("l'application s'affiche sur mobile sans défilement horizontal", async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Accéder à mon dossier' })).toBeVisible()

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalScroll).toBe(false)
})
