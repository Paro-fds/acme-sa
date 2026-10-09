import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H1, signIn } from './auth.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

/**
 * US-201 : l'employé voit son dossier, son affectation en libellés officiels et « Votre dossier est complet à X % ».
 * EMP-H1 (agence AD, « Service Administration ») ; le référentiel fictif est importé d'abord (US-501, réimport sans effet).
 */
test('dossier : libellés officiels de l’affectation et pourcentage', async ({ browser, page }) => {
  const admin = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await adminLogin(admin)
  await admin.goto('/admin/referentiel')
  await admin.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await admin.getByRole('button', { name: 'Importer' }).click()
  await expect(admin.getByText(/^Référentiel importé :/)).toBeVisible()
  await admin.close()

  await signIn(page, EMP_H1)
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: /^Votre dossier est complet à \d+ %$/ })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progression du dossier' })).toBeVisible()

  const job = page.getByRole('region', { name: 'Informations professionnelles' })
  await expect(job.getByText('Agence Démo', { exact: true })).toBeVisible()
  await expect(job.getByText('Région Démo 1')).toBeVisible()
  await expect(job.getByText('Direction des Opérations (démo)')).toBeVisible()
  await expect(job.getByText('AD', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us201-390.png`, fullPage: true })

  await page.setViewportSize({ width: 1280, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us201-1280.png`, fullPage: true })
})
