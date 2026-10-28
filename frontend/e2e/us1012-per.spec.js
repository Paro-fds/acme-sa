import { expect, test } from '@playwright/test'
import { EMP_A, EMP_B, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/4500164a-7e3d-4c5e-a801-f6c21ea8355b/scratchpad/captures'

/** US-1012 : le PER dans PAM, une seule connexion ; balances fictives de backend/demo/per. */
test('Mon PER : balance, comptes, relevé et bulletins, depuis le menu', async ({ page }) => {
  await signIn(page, EMP_A)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.getByRole('link', { name: 'Mon PER' }).click()

  const balance = page.getByRole('region', { name: 'Ma balance PER' })
  await expect(balance).toContainText('121.480,75')
  await expect(balance).toContainText('Mise à jour le 30/09/2026')
  await expect(page.getByRole('list', { name: 'Relevé PER' }).getByRole('listitem')).toHaveCount(2)
  // US-1020 : les bulletins de paie, le plus récent ouvert.
  await expect(page.getByRole('button', { name: /septembre 2026 — net 38.880,00/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/net à payer 38.880,00/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us1012-per-390.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us1012-per-1280.png`, fullPage: true })
})

test('US-1021 : la fiche de paie du mois se télécharge en PDF', async ({ page }) => {
  await signIn(page, EMP_A)
  await page.goto('/per')
  const link = page.getByRole('link', { name: 'Télécharger la fiche de paie (PDF)' })
  await expect(link).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/us1021-fiche-390.png`, fullPage: true })

  const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
  expect(download.suggestedFilename()).toBe('fiche-paie-2026-09.pdf')
  const { readFile } = await import('node:fs/promises')
  const pdf = await readFile(await download.path())
  expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4')
  expect(pdf.toString('latin1')).toContain('38.880,00')

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us1021-fiche-1280.png`, fullPage: true })
})

test('Mon PER : sans balance, le message de l’export', async ({ page }) => {
  await signIn(page, EMP_B)
  await page.goto('/per')
  await expect(page.getByText("Aucune balance n'est disponible pour le moment.")).toBeVisible()
})
