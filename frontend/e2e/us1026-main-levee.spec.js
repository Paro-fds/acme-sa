import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { adminLogin } from './admin.js'
import { E2E_DATA_DIR } from './paths.js'

const CAPTURES =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/4500164a-7e3d-4c5e-a801-f6c21ea8355b/scratchpad/captures'
const EMPLOYEE_ID = '1004' // EMP-D1, LOUIS Paul (courriel dans l'export)

/** US-1005 : un courriel changé il y a une heure, donc gelé 72 heures ; écrit dans la base fictive des tests. */
function hold(sql) {
  const database = new DatabaseSync(join(E2E_DATA_DIR, 'portail.db'))
  try {
    database.prepare("DELETE FROM employee_seen_contact WHERE employee_id = ? AND channel = 'EMAIL'").run(EMPLOYEE_ID)
    if (sql) {
      const changed = new Date(Date.now() - 3600_000).toISOString().slice(0, 19).replace('T', ' ') + '.000000'
      database
        .prepare(
          "INSERT INTO employee_seen_contact (employee_id, channel, value, changed_at) VALUES (?, 'EMAIL', ?, ?)",
        )
        .run(EMPLOYEE_ID, 'nouveau@exemple.test', changed)
    }
  } finally {
    database.close()
  }
}

test.afterEach(() => hold(false))

/** US-1026 (D-64) : la main levée du directeur, depuis le dossier de l'employé dans l'espace de gestion. */
test('US-1026 : lever le gel de 72 heures depuis le dossier', async ({ page }) => {
  hold(true)
  await adminLogin(page)
  await page.goto(`/admin/employes/${EMPLOYEE_ID}`)

  const access = page.getByRole('region', { name: 'Accès' })
  await expect(access).toContainText('Gel de 72 heures en cours : contact changé récemment')
  await access.getByRole('button', { name: 'Lever le gel' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/us1026-confirmation-390.png`, fullPage: true })
  await page.getByRole('alertdialog').getByRole('button', { name: 'Lever le gel' }).click()

  await expect(access).toContainText("Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier.")
  await expect(access).not.toContainText('Gel de 72 heures en cours')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${CAPTURES}/us1026-leve-1280.png`, fullPage: true })
})
