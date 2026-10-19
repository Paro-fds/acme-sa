import { expect, test } from '@playwright/test'
import { acceptConsent, EMP_E, signIn } from './auth.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'

/**
 * US-202 : consentement une seule fois (CA-01), format refusé avec message près du champ (CA-02),
 * « Je n'ai pas d'adresse email » (CA-03), lien choisi dans une liste (CA-04), pourcentage qui monte.
 * EMP-E (pas d'email dans l'export).
 */
test('compléter ses coordonnées, son contact d’urgence et son niveau d’études', async ({ page }) => {
  // CA-01 : la mention passe avant toute saisie, dès la première connexion (US-207, écran 05).
  await signIn(page, EMP_E, { consent: false })
  await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/us202-consentement-390.png`, fullPage: true })
  await acceptConsent(page)
  await page.goto('/profil/coordonnees')

  // Section 1 / 3
  await expect(page.getByRole('heading', { name: 'Mes coordonnées' })).toBeVisible()
  const phone = page.getByLabel(/Numéro de téléphone principal/)
  await phone.fill('3712')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456.').last()).toBeVisible()

  await phone.fill('3712 3456')
  await page.getByRole('checkbox', { name: /Je n'ai pas d'adresse email/ }).check()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Enregistré dans votre profil.')).toBeVisible()
  await expect(page.getByText('37 %')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us202-coordonnees-390.png`, fullPage: true })

  // Section 2 / 3
  await page.goto('/profil/contact-etudes')
  await page.getByLabel('Nom complet de la personne à contacter').fill('Jean Baptiste Pierre')
  await page.getByLabel('Lien avec vous').selectOption({ label: 'Frère / Sœur' })
  await page.getByLabel("Téléphone d'urgence").fill('4812 8901')
  await page.getByRole('radio', { name: /Licence/ }).check()
  await page.screenshot({ path: `${CAPTURES}/us202-contact-390.png`, fullPage: true })
  await page.getByRole('button', { name: /Enregistrer et continuer/ }).click()

  // US-203 : la section 2 enchaîne sur la section 3.
  await expect(page.getByRole('heading', { name: 'Mes informations RH' })).toBeVisible()
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Votre dossier est complet à 62 %' })).toBeVisible()

  // Une seule fois : la mention n'est plus redemandée.
  await page.goto('/profil')
  await page.getByRole('link', { name: /Mes coordonnées/ }).click()
  await expect(page.getByRole('heading', { name: 'Mes coordonnées' })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us202-coordonnees-1280.png`, fullPage: true })
})
