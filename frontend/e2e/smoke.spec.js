import { expect, test } from '@playwright/test'

test("l'application s'affiche sur mobile sans défilement horizontal", async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Votre carrière commence par un dossier complet' })).toBeVisible()

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalScroll).toBe(false)
})
