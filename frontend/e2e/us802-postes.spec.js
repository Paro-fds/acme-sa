import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

/** US-802 : un poste saisi (brouillon), puis publié par l'Administrateur ; l'historique est daté et signé.
 * US-124 : l'Administrateur peut joindre la lettre du directeur RH ; la fiche la montre. */
test('postes ouverts : saisir une fiche, la publier, voir son historique', async ({ page }) => {
  await adminLogin(page)
  // Les unités du poste viennent du référentiel (US-501).
  await page.goto('/admin/referentiel')
  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  await page.goto('/admin/postes')
  await page.getByRole('link', { name: 'Saisir un poste hors catalogue' }).click()
  await page.getByLabel('Code du poste').fill('E2E-802')
  await page.getByLabel('Intitulé').fill('Chargé de crédit (fictif, US-802)')
  await page.getByLabel('Unité du poste').selectOption({ label: 'Agence Démo Nord (Agence)' })
  await page.getByLabel("Date d'ouverture").fill('2026-10-15')
  await page.getByLabel('Date limite').fill('2026-11-15')
  await page.getByLabel('Mission').fill("Instruire les demandes de crédit de l'agence.")
  await page.getByLabel("Niveau d'études minimum").selectOption('LICENCE')
  await page.getByLabel("Ancienneté dans l'institution (années)").fill('2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us802-saisie-390.png`, fullPage: true })
  await page.getByRole('button', { name: 'Suivant' }).click()

  await expect(page.getByRole('heading', { name: 'Chargé de crédit (fictif, US-802)' })).toBeVisible()
  await page.getByLabel('Lettre du directeur RH (facultative)').setInputFiles({
    name: 'lettre-drh-fictive.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.7\n${'0'.repeat(2000)}`),
  })
  await page.getByRole('button', { name: 'Publier' }).click()
  await expect(page.getByText('Poste publié.')).toBeVisible()
  const letter = page.getByRole('region', { name: 'Lettre du directeur RH' })
  await expect(letter).toContainText('lettre-drh-fictive.pdf')
  await expect(letter.getByRole('link', { name: 'Voir la lettre' })).toHaveAttribute('href', /\/api\/admin\/openings\/\d+\/letter$/)
  const history = page.getByRole('list', { name: 'Historique du statut' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await expect(history).toContainText('Publié')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us802-fiche-390.png`, fullPage: true })

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/admin/postes')
  await expect(page.getByRole('list', { name: 'Postes' }).getByText('Chargé de crédit (fictif, US-802)')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us802-liste-1280.png`, fullPage: true })
})
