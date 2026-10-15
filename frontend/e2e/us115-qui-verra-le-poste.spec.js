import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/** US-115 : réserver un poste à des unités et des domaines, en voyant combien d'employés le verront. */
test('nouveau poste : plusieurs unités, plusieurs domaines, aperçu de l’audience', async ({ page }) => {
  test.setTimeout(90000)
  await adminLogin(page)
  await page.goto('/admin/referentiel')
  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  for (const [width, height] of [[1280, 900], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/admin/postes/nouveau')
    const units = page.getByRole('combobox', { name: /Visible seulement par les employés de/ })
    await units.fill('Démo')
    await page.getByRole('listbox', { name: 'Unités proposées' }).getByRole('option').first().click()
    await expect(page.getByRole('list', { name: 'Unités choisies' }).getByRole('listitem')).toHaveCount(1)
    await page.getByRole('checkbox', { name: 'Finance', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Comptabilité', exact: true }).check()

    const preview = page.getByRole('region', { name: 'Aperçu de l’audience' })
    await expect(preview).toContainText(/verra|verront/)
    await expect(preview).toContainText('sans certificat validé en Comptabilité ou Finance')
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.screenshot({ path: `${CAPTURES}/us115-poste-${width}.png`, fullPage: true })
  }

  await page.getByLabel('Code du poste').fill('E2E-115')
  await page.getByLabel('Intitulé').fill('Chargé de crédit (fictif)')
  await page.getByLabel('Unité du poste').selectOption({ index: 1 })
  await page.getByLabel("Date d'ouverture").fill('2026-10-15')
  await page.getByLabel('Date limite').fill('2026-11-15')
  await page.getByLabel('Mission').fill("Instruire les demandes de crédit de l'agence.")
  await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
  await expect(page.getByRole('heading', { name: 'Chargé de crédit (fictif)' })).toBeVisible()
  await expect(page.getByText('Domaines : Comptabilité ou Finance')).toBeVisible()
})
