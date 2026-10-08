import { expect, test } from '@playwright/test'

function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
}

/** US-105 : page d'accueil avant la connexion, sur téléphone (390 px) et sur ordinateur (1280 px). */
test("l'accueil présente les 3 bénéfices et mène à la connexion", async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Votre carrière commence par un dossier complet' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Ce que le portail vous apporte' }).getByRole('listitem')).toHaveCount(3)
  expect(await hasHorizontalScroll(page)).toBe(false)

  await page.getByRole('link', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible()
})

test("l'accueil s'affiche aussi sur ordinateur sans défilement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
  expect(await hasHorizontalScroll(page)).toBe(false)
})
