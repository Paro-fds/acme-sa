import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H2, acceptConsent, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/a3ac3411-0311-4109-b6a8-9aa1d82a8e84/scratchpad/captures'
const BASE = 'http://127.0.0.1:8001'

const noHorizontalScroll = async (page, width) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

/**
 * US-120 : un poste publié sans critère est ouvert à tous ; EMP-H2 le voit sur la cloche, l'accueil et la page
 * Notifications. Le poste est clôturé à la fin pour ne pas changer ce que voient les autres tests.
 */
test('notifications employé : poste ouvert pour moi sur la cloche, l’accueil et la page Notifications', async ({ browser }) => {
  test.setTimeout(120000)
  const admin = await (await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } })).newPage()
  await adminLogin(admin)
  await admin.goto('/admin/postes/nouveau?fiche=caissier')
  await expect(admin.getByText(/Repris de la fiche « Caissier »/)).toBeVisible()
  await admin.getByLabel('Code du poste').fill('E2E-120')
  await admin.getByLabel('Unité du poste').fill('Agence Démo Nord')
  await admin.getByLabel('Grade visé').fill('6')
  const today = new Date().toISOString().slice(0, 10)
  await admin.getByLabel("Date d'ouverture").fill(today)
  await admin.getByLabel('Date limite').fill('2099-12-31')
  // Sans critère : tous les employés le voient.
  const checked = admin.getByRole('checkbox', { checked: true })
  while ((await checked.count()) > 0) await checked.first().uncheck()
  await admin.getByLabel("Niveau d'études minimum").selectOption('')
  await admin.getByRole('button', { name: 'Enregistrer le brouillon' }).click()
  await admin.getByRole('button', { name: 'Publier' }).click()
  await expect(admin.getByText('Poste publié.')).toBeVisible()

  const page = await (await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } })).newPage()
  await signIn(page, EMP_H2)
  await page.goto('/accueil')
  if (await page.waitForURL(/avant-de-commencer/, { timeout: 3000 }).then(() => true, () => false)) await acceptConsent(page)

  const card = page.getByRole('region', { name: 'Nouveau pour vous' })
  await expect(card).toContainText('Caissier · Agence Démo Nord')
  await expect(page.getByRole('link', { name: /Notifications, \d+ non lues?/ })).toBeVisible()
  await noHorizontalScroll(page, 390)
  await page.screenshot({ path: `${CAPTURES}/us120-accueil-390.png`, fullPage: true })

  await page.getByRole('link', { name: /Notifications, \d+ non lues?/ }).click()
  await expect(page.getByRole('list', { name: 'Mes notifications' })).toContainText('Nouveau poste ouvert pour vous')
  await noHorizontalScroll(page, 390)
  await page.screenshot({ path: `${CAPTURES}/us120-notifications-390.png`, fullPage: true })

  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto('/accueil')
  await expect(page.getByRole('region', { name: 'Nouveau pour vous' })).toBeVisible()
  await page.getByRole('button', { name: /Notifications, \d+ non lues?/ }).click()
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toContainText('Caissier')
  await noHorizontalScroll(page, 1280)
  await page.screenshot({ path: `${CAPTURES}/us120-cloche-1280.png` })

  await page.getByRole('dialog', { name: 'Notifications' }).getByText('Nouveau poste ouvert pour vous').click()
  await expect(page).toHaveURL(/\/carriere$/)
  await page.goto('/accueil')
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Nouveau pour vous' })).toHaveCount(0)

  await admin.getByRole('button', { name: 'Clôturer' }).click()
  await expect(admin.getByText('Poste clôturé.')).toBeVisible()
})
