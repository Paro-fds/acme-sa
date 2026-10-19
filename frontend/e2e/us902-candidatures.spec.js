import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H2, signIn } from './auth.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'
const TITLE = 'Gestionnaire de portefeuille (fictif)'

/** Profil complet de l'employée par l'API (D-23 : seul un profil complet postule). */
async function completeProfile(page) {
  const api = page.request
  await api.post('/api/me/dossier/consent', { data: { information_notice: true, whatsapp: false } })
  await api.put('/api/me/dossier/coordinates', {
    data: { telephone: '3712 3456', address: '12 rue Capois, Port-au-Prince', email: '', no_email: true },
  })
  await api.put('/api/me/dossier/contact-and-education', {
    data: { contact_name: 'Paul Pierre', contact_relationship: 'SIBLING', contact_telephone: '4812 8901', education_level: 'LICENCE' },
  })
  for (const key of ['agency_confirmed', 'position_confirmed', 'hire_date_confirmed']) {
    await api.post(`/api/me/dossier/hr-information/${key}/confirm`)
  }
}

/**
 * US-902 (choix du 2026-10-11) : EMP-H2 postule à un poste publié, reçoit l'accusé de réception,
 * un RH fait avancer la candidature depuis la fiche du poste, l'employée voit la nouvelle étape.
 */
test('candidature : postuler, accusé de réception, étape suivante côté RH, suivi', async ({ page, browser }) => {
  const today = new Date().toISOString().slice(0, 10)
  await adminLogin(page)
  await page.goto('/admin/referentiel')
  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  await page.goto('/admin/postes/nouveau')
  await page.getByLabel('Code du poste').fill('E2E-902')
  await page.getByLabel('Intitulé').fill(TITLE)
  await page.getByLabel('Unité du poste').selectOption({ label: 'Agence Démo Nord (Agence)' })
  await page.getByLabel("Date d'ouverture").fill(today)
  await page.getByLabel('Date limite').fill('2099-12-31')
  await page.getByLabel('Mission').fill('Suivre un portefeuille de clients (poste fictif).')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Publier' }).click()
  await expect(page.getByText('Poste publié.')).toBeVisible()
  const openingUrl = page.url()

  const employee = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const employeePage = await employee.newPage()
  await signIn(employeePage, EMP_H2)
  await completeProfile(employeePage)
  await employeePage.goto('/carriere')
  const card = employeePage.getByRole('article', { name: TITLE })
  await card.getByRole('button', { name: 'Postuler' }).click()
  await card.getByLabel('Votre message aux RH (facultatif)').fill('Je suis la caissière de l’agence depuis 2020.')
  await card.getByLabel('Votre CV (facultatif)').setInputFiles({
    name: 'cv-marie-fictif.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.7 ${'0'.repeat(2000)}`),
  })
  await card.getByRole('button', { name: 'Envoyer ma candidature' }).click()
  await expect(employeePage.getByText(/^Candidature reçue le/)).toBeVisible()
  await expect(card.getByText(/Candidature envoyée le/)).toBeVisible()
  const mine = employeePage.getByRole('list', { name: 'Mes candidatures' })
  await expect(mine).toContainText('Étape 1 sur 7 : Reçue et enregistrée')
  expect(await employeePage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await employeePage.screenshot({ path: `${CAPTURES}/us902-candidature-390.png`, fullPage: true })

  await page.goto(openingUrl)
  const applications = page.getByRole('region', { name: 'Candidatures (1)' })
  await expect(applications).toContainText('Marie PIERRE')
  await expect(applications.getByRole('list', { name: 'Profil au moment de la candidature' })).toContainText('Poste : Caissière')
  const cvLink = applications.getByRole('link', { name: /Voir le CV \(cv-marie-fictif\.pdf\)/ })
  const cv = await page.request.get(await cvLink.getAttribute('href'))
  expect(cv.status()).toBe(200)
  expect(cv.headers()['content-type']).toBe('application/pdf')
  await applications.getByLabel('Étape suivante').selectOption('DRH_REVIEW')
  await applications.getByRole('button', { name: "Passer à l'étape" }).click()
  await expect(applications).toContainText('Étape 2 sur 7 : Étude par la DRH')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us902-fiche-rh-1280.png`, fullPage: true })

  // US-123 : la tuile « Ma candidature » de l'accueil mène directement à la section, même en bas de page sur téléphone.
  await employeePage.goto('/accueil')
  await expect(employeePage.getByRole('heading', { name: /Bonjour/ })).toBeVisible()
  await employeePage.goto('/carriere#mes-candidatures')
  const heading = employeePage.getByRole('heading', { name: 'Mes candidatures' })
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  await employeePage.screenshot({ path: `${CAPTURES}/us123-ancre-candidatures-390.png` })
  await expect(employeePage.getByRole('list', { name: 'Mes candidatures' })).toContainText('Étape 2 sur 7 : Étude par la DRH')
  await employeePage.setViewportSize({ width: 1280, height: 900 })
  await employeePage.screenshot({ path: `${CAPTURES}/us902-suivi-1280.png`, fullPage: true })
  await employee.close()
})
