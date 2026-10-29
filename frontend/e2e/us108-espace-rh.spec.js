import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

const DEMO_REFERENTIAL = resolve(import.meta.dirname, '../../backend/demo/referentiel-fictif.xlsx')
const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const REFONTE =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/7be86a6f-dfd2-47a0-9b44-97dbe2e73527/scratchpad/captures'

/** Écrans RH validés (A02 → A11) et leur rubrique du menu. */
const SCREENS = [
  { path: '/admin', name: 'a02-tableau-de-bord', heading: 'Tableau de bord', menu: 'Tableau de bord' },
  { path: '/admin/validation', name: 'a03-file-de-validation', heading: 'File de validation des certificats', menu: 'File de validation' },
  { path: '/admin/employes', name: 'a06-employes', heading: 'Employés', menu: 'Employés' },
  { path: '/admin/signalements', name: 'a08-signalements', heading: "Signalements d'erreur", menu: 'Signalements' },
  { path: '/admin/comptes', name: 'a10-comptes-et-roles', heading: 'Comptes et rôles', menu: 'Comptes et rôles' },
  { path: '/admin/audit', name: 'a11-journal-d-audit', heading: "Journal d'audit", menu: "Journal d'audit" },
  { path: '/admin/postes', name: 'postes-a-pourvoir', heading: 'Publication de postes', menu: 'Postes à pourvoir' },
]

/** US-108 : chaque écran RH a le cadre de l'écran A02, à 1280 px comme à 390 px. */
test('cadre de l’espace RH : barre du haut, menu et titre sur chaque écran, à 1280 et 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await adminLogin(page)
  await page.goto('/admin/referentiel')
  await page.getByLabel('Classeur Excel (.xlsx)').setInputFiles(DEMO_REFERENTIAL)
  await page.getByRole('button', { name: 'Importer' }).click()
  await expect(page.getByText(/^Référentiel importé :/)).toBeVisible()

  for (const screen of SCREENS) {
    await page.goto(screen.path)
    // US-127 : « Espace de gestion » et « Se déconnecter » dans le panneau bleu ; rôle dans la barre du haut.
    const panel = page.locator('[data-nav-panel]')
    await expect(panel).toContainText('Espace de gestion')
    await expect(panel.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
    await expect(page.getByRole('banner').getByText('Administrateur', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen.heading)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    // CA-04 : à 1280 px, le menu est visible et garde sa largeur, quel que soit le contenu.
    const nav = page.getByRole('navigation', { name: 'Menu principal RH' })
    await expect(nav.getByRole('link', { name: new RegExp(`^${screen.menu}`) })).toHaveAttribute('aria-current', 'page')
    expect((await page.locator('[data-nav-panel]').boundingBox()).width).toBe(288)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
    await page.screenshot({ path: `${CAPTURES}/us108-${screen.name}-1280.png`, fullPage: true })
    if (screen.path === '/admin') {
      // US-132 : le tableau de bord de la refonte (bonjour, tuiles, agences, à faire).
      await expect(page.getByRole('region', { name: 'Dossiers complets par agence' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'À faire' })).toBeVisible()
      await page.screenshot({ path: `${REFONTE}/us132-tableau-de-bord-1280.png`, fullPage: true })
    }
    if (screen.path === '/admin/employes') {
      // US-134 : la liste de la refonte (quatre filtres, « N employés sur M », tableau).
      await expect(page.getByRole('table', { name: 'Employés' })).toBeVisible()
      await expect(page.getByText(/^\d+ employés sur \d+$/)).toBeVisible()
      await page.screenshot({ path: `${REFONTE}/us134-employes-1280.png`, fullPage: true })
    }
    if (screen.path === '/admin/postes') {
      // US-135 : la publication de postes de la refonte (chiffres, onglets, « Publier un poste »).
      await expect(page.getByRole('complementary', { name: 'Comment publier' })).toBeVisible()
      await page.screenshot({ path: `${REFONTE}/us135-postes-1280.png`, fullPage: true })
    }
  }

  // A07 : dossier d'un employé, ouvert depuis la liste, dans le même cadre (rubrique « Employés »).
  await page.goto('/admin/employes')
  await page.getByRole('table', { name: 'Employés' }).getByRole('link').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('navigation', { name: 'Menu principal RH' }).getByRole('link', { name: /^Employés/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.screenshot({ path: `${CAPTURES}/us108-a07-dossier-1280.png`, fullPage: true })

  // CA-04 : à 390 px, le menu s'ouvre par un bouton et rien ne défile horizontalement.
  await page.setViewportSize({ width: 390, height: 844 })
  for (const screen of SCREENS) {
    await page.goto(screen.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen.heading)
    expect(await page.evaluate(() => document.documentElement.scrollWidth), screen.name).toBeLessThanOrEqual(390)
    if (screen.path === '/admin') {
      await expect(page.getByRole('region', { name: 'À faire' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
      await page.screenshot({ path: `${REFONTE}/us132-tableau-de-bord-390.png`, fullPage: true })
    }
    if (screen.path === '/admin/postes') {
      await expect(page.getByRole('complementary', { name: 'Comment publier' })).toBeVisible()
      await page.screenshot({ path: `${REFONTE}/us135-postes-390.png`, fullPage: true })
    }
  }
  await page.getByRole('button', { name: 'Menu de navigation RH' }).click()
  await page.getByRole('navigation', { name: 'Menu principal RH' }).getByRole('link', { name: /^Employés/ }).click()
  await expect(page).toHaveURL(/\/admin\/employes$/)
  await page.screenshot({ path: `${CAPTURES}/us108-a06-employes-390.png`, fullPage: true })
  await expect(page.getByRole('list', { name: 'Employés' })).toBeVisible()
  await page.screenshot({ path: `${REFONTE}/us134-employes-390.png`, fullPage: true })
})
