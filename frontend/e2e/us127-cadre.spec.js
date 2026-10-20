import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H2, acceptConsent, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/7be86a6f-dfd2-47a0-9b44-97dbe2e73527/scratchpad/captures'

/** Allonge la page puis la fait défiler : le panneau de menu doit rester collé en haut de l'écran (CA-02). */
async function expectPanelStaysWhileScrolling(page, navName) {
  const panel = page.locator('[data-nav-panel]').filter({ has: page.getByRole('navigation', { name: navName }) })
  await page.evaluate(() => {
    const filler = document.createElement('div')
    filler.style.height = '3000px'
    document.querySelector('main').appendChild(filler)
    window.scrollTo(0, 2000)
  })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
  const box = await panel.boundingBox()
  expect(box.y).toBe(0)
  await expect(panel.getByText(/Grandir ensemble/)).toBeInViewport()
}

/** US-127 : même cadre dans les deux espaces : panneau bleu fixe à gauche, barre du haut blanche. */
test('espace employé sur ordinateur : le menu reste en place pendant le défilement', async ({ page }) => {
  await signIn(page, EMP_H2)
  await page.goto('/accueil')
  if (await page.waitForURL(/avant-de-commencer/, { timeout: 3000 }).then(() => true, () => false)) await acceptConsent(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByRole('navigation', { name: 'Espace employé' })).toBeVisible()
  await expect(page.getByRole('banner').getByText('Marie PIERRE')).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/us127-employe-1280.png` })
  await expectPanelStaysWhileScrolling(page, 'Espace employé')
})

test('espace de gestion : menu fixe sur ordinateur, ouvert par ☰ sur téléphone', async ({ page }) => {
  await adminLogin(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/employes')
  await expect(page.getByRole('navigation', { name: 'Menu principal RH' })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/us127-gestion-1280.png` })
  await expectPanelStaysWhileScrolling(page, 'Menu principal RH')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/employes')
  const nav = page.getByRole('navigation', { name: 'Menu principal RH' })
  await expect(nav).not.toBeInViewport()
  await page.getByRole('button', { name: 'Menu de navigation RH' }).click()
  await expect(nav).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us127-gestion-390.png` })
})
