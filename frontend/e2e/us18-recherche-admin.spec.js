import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'

/** US-18 : recherche sur mobile (390 px), barre collante, retour depuis un dossier (US-20). */
test('recherche admin : barre collante, résultats, aucun résultat, effacer', async ({ page }) => {
  await adminLogin(page)
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/employes')
  await expect(page.getByText('7 employés')).toBeVisible()

  // CA-10 : pleine largeur et toujours visible en haut lors du défilement
  const search = page.getByRole('searchbox', { name: 'Rechercher un employé' })
  const bar = await page.getByRole('search').boundingBox()
  expect(bar.width).toBe(390)
  await page.mouse.wheel(0, 2000)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200)
  await expect(search).toBeInViewport()
  // Mesure répétée : sous charge, le défilement peut être encore en cours au premier relevé.
  const top = () => page.getByRole('search').boundingBox().then((box) => box.y)
  await expect.poll(top).toBeGreaterThanOrEqual(60)
  expect(await top()).toBeLessThan(80)

  // CA-01 : recherche par nom
  await search.fill('pierre')
  await expect(page.getByText('2 employés')).toBeVisible()
  await expect(page).toHaveURL(/\?search=pierre$/)
  const cards = page.getByRole('list', { name: 'Employés' }).getByRole('listitem')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('PIERRE Marie')

  // CA-11 : ouvrir un résultat (US-20) puis revenir en arrière → même recherche
  await cards.first().getByRole('link').click()
  await expect(page).toHaveURL(/\/admin\/employes\/1002$/)
  await expect(page.getByRole('heading', { name: 'PIERRE Marie' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\?search=pierre$/)
  await expect(search).toHaveValue('pierre')
  await expect(page.getByText('2 employés')).toBeVisible()
  // Même chose avec le bouton retour de l'en-tête du dossier
  await cards.nth(1).getByRole('link').click()
  await expect(page.getByRole('heading', { name: 'PIERRE Marie' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour' }).click()
  await expect(page).toHaveURL(/\?search=pierre$/)
  await expect(page.getByText('2 employés')).toBeVisible()

  // CA-07 puis CA-08
  await search.fill('zzz')
  await expect(page.getByText('Aucun employé ne correspond à votre recherche.')).toBeVisible()
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  await expect(page.getByText('7 employés')).toBeVisible()
  await expect(search).toHaveValue('')

  // Rechargement : le terme de l'adresse est repris
  await page.goto('/admin/employes?search=jean%20joseph')
  await expect(search).toHaveValue('jean joseph')
  await expect(page.getByText('1 employé', { exact: true })).toBeVisible()
})
