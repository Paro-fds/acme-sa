import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { EMP_H2, signIn } from './auth.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

const hasHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/** US-116 : un employé signale une erreur ; l'Administrateur le voit dans la cloche, puis sur la page Notifications. */
test('notifications : un signalement apparaît dans la cloche et ouvre la file', async ({ page, browser }) => {
  test.setTimeout(120000)
  await signIn(page, EMP_H2)
  await page.goto('/profil/informations-rh')
  if (await page.waitForURL(/avant-de-commencer$/, { timeout: 3000 }).then(() => true, () => false)) {
    await page.getByRole('checkbox', { name: /J'ai lu et j'accepte/ }).check()
    await page.getByRole('button', { name: /Continuer vers mon espace/ }).click()
    await page.waitForURL(/\/(accueil|profil\/informations-rh)$/)
    await page.goto('/profil/informations-rh')
  }
  const hire = page.getByRole('region', { name: "Date d'embauche" })
  await hire.getByRole('button', { name: 'Signaler une erreur' }).click()
  await hire.getByLabel('Quelle est la bonne information ?').fill('01/06/2016')
  await hire.getByRole('button', { name: 'Envoyer aux RH' }).click()
  await expect(hire.getByText(/^Signalé aux RH le/)).toBeVisible()

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const admin = await context.newPage()
  await adminLogin(admin)
  await admin.goto('/admin')
  await admin.getByRole('button', { name: /^Notifications, \d+ non lues?$/ }).click()
  const panel = admin.getByRole('dialog', { name: 'Notifications' })
  const item = panel.getByRole('link', { name: /Marie PIERRE signale une erreur/ })
  await expect(item).toContainText("Date d'embauche")
  expect(await hasHorizontalScroll(admin)).toBe(false)
  await admin.screenshot({ path: `${CAPTURES}/us116-cloche-1280.png` })
  await item.click()
  await expect(admin).toHaveURL(/\/admin\/signalements$/)

  await admin.setViewportSize({ width: 390, height: 844 })
  await admin.getByRole('link', { name: /^Notifications, / }).click()
  await expect(admin).toHaveURL(/\/admin\/notifications$/)
  await expect(admin.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible()
  await expect(admin.getByRole('link', { name: /Marie PIERRE signale une erreur/ })).toBeVisible()
  expect(await hasHorizontalScroll(admin)).toBe(false)
  await admin.screenshot({ path: `${CAPTURES}/us116-page-390.png`, fullPage: true })
  await context.close()
})
