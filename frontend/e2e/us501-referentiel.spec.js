import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')

/** US-501 : un administrateur importe le référentiel fictif, puis voit les régions et leurs agences. */
test('référentiel : import du classeur Excel, régions et agences, valeurs à rattacher', async ({ page }) => {
  await adminLogin(page)
  await page.getByRole('button', { name: 'Menu du compte' }).click()
  await page.getByRole('menuitem', { name: 'Référentiel' }).click()
  await expect(page).toHaveURL(/\/admin\/referentiel$/)

  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  const region = page.getByRole('region', { name: 'Région Démo 1' })
  await expect(region.getByText('Agence Démo Nord')).toBeVisible()
  // US-502 : les valeurs sans unité, avec le nombre d'employés concernés.
  const toAttach = page.getByRole('region', { name: 'À rattacher' })
  await expect(toAttach.getByText('PB', { exact: true })).toBeVisible()
  await expect(toAttach.getByText('RC', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(region).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({
    path: 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures/us501-1280.png',
    fullPage: true,
  })
})
