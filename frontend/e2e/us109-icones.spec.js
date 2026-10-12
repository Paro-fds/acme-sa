import { expect, test } from '@playwright/test'

const iconStates = (page) =>
  page.$$eval('.material-symbols-outlined', (icons) =>
    icons.map((icon) => {
      const style = getComputedStyle(icon)
      return {
        name: icon.textContent,
        hidden: style.color === 'rgba(0, 0, 0, 0)',
        fitsItsBox: icon.clientWidth <= parseFloat(style.fontSize) + 1,
      }
    }),
  )

/**
 * US-109 : les icônes ne s'affichent jamais sous forme de texte, et le portail ne télécharge
 * que sa petite police d'icônes. Le moment où `icons-ready` est posé (police arrivée) : `src/lib/icons.test.js`.
 */
test('icônes : case vide tant que la police manque, puis dessinées par la petite police du portail', async ({ page }) => {
  const fontRequests = []
  page.on('response', async (response) => {
    if (/material.*\.woff2$/.test(response.url())) {
      fontRequests.push({ url: response.url(), size: (await response.body()).length })
    }
  })

  await page.goto('/')
  await expect(page.getByRole('link', { name: /Se connecter/ })).toBeVisible()

  // CA-01 : police arrivée → icônes visibles, dessinées par la police du portail, chacune dans sa case de 1em.
  await expect.poll(async () => (await iconStates(page)).every((icon) => !icon.hidden && icon.fitsItsBox)).toBe(true)
  expect(await page.evaluate(() => document.fonts.check('24px "Material Symbols Outlined"', 'login'))).toBe(true)

  // CA-01 : sans la police (classe retirée), aucune icône ne montre son nom : case vide, texte transparent.
  await page.evaluate(() => document.documentElement.classList.remove('icons-ready'))
  const waiting = await iconStates(page)
  expect(waiting.length).toBeGreaterThan(0)
  expect(waiting.filter((icon) => !icon.hidden || !icon.fitsItsBox)).toEqual([])

  // CA-02 : une seule police d'icônes, la petite (pas les 4 Mo de la police complète).
  expect(fontRequests).toHaveLength(1)
  expect(fontRequests[0].url).toMatch(/\/fonts\/material-symbols\.woff2$/)
  expect(fontRequests[0].size).toBeLessThan(200 * 1024)
})
