import { expect, test } from '@playwright/test'
import { EMP_H2, acceptConsent, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/** US-114 : « Ma carrière » retrace le parcours en frise ; « Mon parcours » n'existe plus (son adresse y mène). */
test('Ma carrière : « Aujourd’hui », la frise, puis les postes ; /parcours y mène', async ({ page }) => {
  test.setTimeout(90000)
  await signIn(page, EMP_H2)
  await page.goto('/accueil')
  if (await page.waitForURL(/avant-de-commencer/, { timeout: 3000 }).then(() => true, () => false)) await acceptConsent(page)

  for (const [width, height] of [[1280, 860], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/parcours')
    await expect(page).toHaveURL(/\/carriere$/)
    // US-131 : « Aujourd'hui » est la première ligne de la frise.
    await expect(page.getByRole('list', { name: 'Mon parcours, du plus récent au plus ancien' })).toContainText('Aujourd’hui')
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Postes ouverts pour vous · \d+$/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Mon parcours/ })).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${CAPTURES}/us114-carriere-${width}.png`, fullPage: true })
    await page.screenshot({ path: `C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/7be86a6f-dfd2-47a0-9b44-97dbe2e73527/scratchpad/captures/us131-carriere-${width}.png`, fullPage: true })
  }
})
