import { expect, test } from '@playwright/test'
import { EMP_A, EMP_B, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/4500164a-7e3d-4c5e-a801-f6c21ea8355b/scratchpad/captures'

/** US-1012 : le PER dans PAM, une seule connexion ; balances fictives de backend/demo/per. */
test('US-1023 : le menu de « Mon PER », la balance en USD et le relevé', async ({ page }) => {
  await signIn(page, EMP_A)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.getByRole('link', { name: 'Mon PER' }).click()
  const menu = page.getByRole('list', { name: 'Documents du PER' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us1023-menu-390.png`, fullPage: true })

  await menu.getByRole('link', { name: /Balance PER/ }).click()
  const balance = page.getByRole('region', { name: 'Ma balance PER' })
  await expect(balance).toContainText('121.480,75 USD')
  await expect(balance).toContainText('Septembre 2026 · mise à jour le 30/09/2026')
  await page.screenshot({ path: `${CAPTURES}/us1023-balance-390.png`, fullPage: true })

  await page.getByRole('link', { name: 'Menu principal' }).click()
  await menu.getByRole('link', { name: /Relevé PER/ }).click()
  await page.getByRole('button', { name: 'Afficher le relevé' }).click()
  await expect(page.getByRole('list', { name: 'Relevé PER' }).getByRole('listitem')).toHaveCount(2)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/per')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us1023-menu-1280.png`, fullPage: true })
})

test('US-1022 : la fiche de paie au format du directeur, dans « Mon PER »', async ({ page }) => {
  await signIn(page, EMP_A)
  await page.goto('/per/fiche')
  const sheet = page.frameLocator('iframe[title="Fiche de paie de septembre 2026"]')
  await expect(sheet.getByText('FICHE DE PAIE')).toBeVisible()
  await expect(sheet.getByText(/HTG 38\s880,00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enregistrer en PDF' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us1022-fiche-390.png`, fullPage: true })

  await page.getByRole('list', { name: 'Mois disponibles' }).getByRole('button', { name: 'Août 2026' }).click()
  await expect(page.frameLocator('iframe[title="Fiche de paie de août 2026"]').getByText('Août 2026')).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us1022-fiche-1280.png`, fullPage: true })
})

test('US-1024 : le relevé entre deux dates, puis le fichier PDF', async ({ page }) => {
  // La fenêtre de choix du dossier ne se pilote pas : le test passe par le téléchargement classique.
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await signIn(page, EMP_A)
  await page.goto('/per/releve')
  await expect(page.getByText('Photos en base : août 2026, septembre 2026.')).toBeVisible()
  await page.getByLabel('Date de début').fill('01082026')
  await expect(page.getByLabel('Date de début')).toHaveValue('01/08/2026')
  await page.getByRole('button', { name: 'Afficher le relevé' }).click()

  const months = page.getByRole('list', { name: 'Relevé PER' }).getByRole('listitem')
  await expect(months).toHaveCount(2)
  await expect(months.first()).toContainText('Août 2026')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us1024-releve-390.png`, fullPage: true })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Relevé en PDF' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^Releve-PER-2026-08-01-au-\d{4}-\d{2}-\d{2}\.pdf$/)
  const { readFile } = await import('node:fs/promises')
  const pdf = await readFile(await download.path())
  expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4')
  expect(pdf.toString('latin1')).toContain('Montants en USD.')
  await expect(page.getByRole('status')).toHaveText('Le relevé PDF a été enregistré.')

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us1024-releve-1280.png`, fullPage: true })
})

test('Mon PER : sans balance, le message de l’export', async ({ page }) => {
  await signIn(page, EMP_B)
  await page.goto('/per/balance')
  await expect(page.getByText("Aucune balance n'est disponible pour le moment.")).toBeVisible()
})
