import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_B, EMP_E, signIn } from './auth.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'
const TITLE = 'Chef d’agence adjoint (fictif)'

/**
 * US-801 (choix du 2026-10-11) : un poste publié n'apparaît qu'aux employés aptes.
 * Critère : 15 ans d'ancienneté. EMP-E (embauchée en 2005) le voit ; EMP-B (embauché en 2024) non.
 */
test('postes ouverts : seul l’employé apte voit le poste publié', async ({ page, browser }) => {
  const today = new Date().toISOString().slice(0, 10)
  await adminLogin(page)
  await page.goto('/admin/referentiel')
  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  await page.goto('/admin/postes/nouveau')
  await page.getByLabel('Code du poste').fill('E2E-801')
  await page.getByLabel('Intitulé').fill(TITLE)
  await page.getByLabel('Unité du poste').selectOption({ label: 'Agence Démo Nord (Agence)' })
  await page.getByLabel("Date d'ouverture").fill(today)
  await page.getByLabel('Date limite').fill('2099-12-31')
  await page.getByLabel('Mission').fill("Seconder le chef d'agence (poste fictif).")
  await page.getByLabel("Ancienneté dans l'institution (années)").fill('15')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Publier' }).click()
  await expect(page.getByText('Poste publié.')).toBeVisible()

  const employee = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const employeePage = await employee.newPage()
  await signIn(employeePage, EMP_E)
  await employeePage.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Ma carrière' }).click()
  const list = employeePage.getByRole('list', { name: 'Postes ouverts pour vous' })
  await expect(list.getByRole('heading', { name: TITLE })).toBeVisible()
  // US-131 : la carte se déplie pour montrer les critères.
  await list.getByRole('article', { name: TITLE }).getByRole('button', { name: 'Voir le poste et postuler' }).click()
  await expect(list).toContainText("Ancienneté dans l'institution : 15 ans au moins")
  expect(await employeePage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await employeePage.screenshot({ path: `${CAPTURES}/us801-carriere-390.png`, fullPage: true })
  await employeePage.setViewportSize({ width: 1280, height: 900 })
  await expect(list).toBeVisible()
  await employeePage.screenshot({ path: `${CAPTURES}/us801-carriere-1280.png`, fullPage: true })
  await employee.close()

  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await signIn(otherPage, EMP_B)
  await otherPage.goto('/carriere')
  await expect(otherPage.getByRole('heading', { name: /^Postes ouverts pour vous · \d+$/ })).toBeVisible()
  await expect(otherPage.getByRole('heading', { name: TITLE })).toHaveCount(0)
  await other.close()
})
