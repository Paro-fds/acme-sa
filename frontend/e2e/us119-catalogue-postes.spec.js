import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/a3ac3411-0311-4109-b6a8-9aa1d82a8e84/scratchpad/captures'

const noHorizontalScroll = async (page, width) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

/** US-119 : le catalogue des postes ACME (vraies fiches), l'aperçu d'une fiche, puis la saisie pré-remplie. */
test('catalogue des postes : chercher une fiche, la lire, la publier pré-remplie', async ({ page }) => {
  await adminLogin(page)
  await page.goto('/admin/postes')
  await page.getByRole('tab', { name: /Catalogue des postes ACME/ }).click()
  await expect(page.getByRole('list', { name: 'Fiches de poste' }).getByRole('listitem')).toHaveCount(69)

  await page.getByLabel('Rechercher un poste').fill('comptable junior')
  const list = page.getByRole('list', { name: 'Fiches de poste' })
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await list.getByRole('button', { name: /Voir/ }).click()
  const preview = page.getByRole('region', { name: 'Comptable Junior' })
  await expect(preview.getByText('Missions')).toBeVisible()
  await noHorizontalScroll(page, 390)
  await page.screenshot({ path: `${CAPTURES}/us119-catalogue-390.png`, fullPage: true })

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.getByRole('region', { name: 'Comptable Junior' })).toBeVisible()
  await noHorizontalScroll(page, 1280)
  await page.screenshot({ path: `${CAPTURES}/us119-catalogue-1280.png`, fullPage: true })

  await page.getByRole('link', { name: /Publier ce poste/ }).click()
  await expect(page.getByText(/Repris de la fiche « Comptable Junior »/)).toBeVisible()
  await expect(page.getByLabel('Intitulé')).toHaveValue('Comptable Junior')
  await expect(page.getByRole('checkbox', { name: 'Comptabilité' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Finance', exact: true })).toBeChecked()
  await expect(page.getByLabel("Niveau d'études minimum")).toHaveValue('LICENCE')
  await noHorizontalScroll(page, 1280)
  await page.screenshot({ path: `${CAPTURES}/us119-publier-1280.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await noHorizontalScroll(page, 390)
  await page.screenshot({ path: `${CAPTURES}/us119-publier-390.png`, fullPage: true })
})
