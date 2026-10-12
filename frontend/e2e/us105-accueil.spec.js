import { expect, test } from '@playwright/test'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
}

/** US-105, US-110 : accueil public et connexion, sur téléphone (390 px) et sur ordinateur (1280 px). */
test("téléphone : l'accueil montre la photo, les bénéfices et les étapes, puis mène à la connexion", async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Votre carrière commence par un dossier complet' })).toBeVisible()
  await expect(page.getByRole('img', { name: /équipe d.ACME SA/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Ce que vous y gagnez' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Trois étapes' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByText(/Penseuse/)).toHaveCount(0)
  expect(await hasHorizontalScroll(page)).toBe(false)
  await page.screenshot({ path: `${CAPTURES}/us110-accueil-390.png`, fullPage: true })

  await page.getByRole('link', { name: 'Compléter mon dossier' }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Créer mon mot de passe' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Date de naissance' }).getByRole('textbox')).toHaveCount(3)
  expect(await hasHorizontalScroll(page)).toBe(false)
  await page.screenshot({ path: `${CAPTURES}/us110-connexion-390.png`, fullPage: true })
})

test('ordinateur : la photo à côté du texte (accueil) et du formulaire (connexion), sans défilement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const photo = await page.getByRole('img', { name: /équipe d.ACME SA/ }).boundingBox()
  const title = await page.getByRole('heading', { level: 1 }).boundingBox()
  expect(photo.x).toBeGreaterThan(title.x + title.width - 1)
  expect(await hasHorizontalScroll(page)).toBe(false)
  await page.screenshot({ path: `${CAPTURES}/us110-accueil-1280.png`, fullPage: true })

  await page.getByRole('link', { name: 'Se connecter' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion' })).toBeVisible()
  const loginPhoto = await page.getByRole('img', { name: /équipe d.ACME SA/ }).boundingBox()
  const form = await page.getByRole('form', { name: 'Vous avez déjà un mot de passe' }).boundingBox()
  expect(form.x).toBeGreaterThan(loginPhoto.x + loginPhoto.width - 1)
  expect(await hasHorizontalScroll(page)).toBe(false)
  await page.screenshot({ path: `${CAPTURES}/us110-connexion-1280.png`, fullPage: true })
})
