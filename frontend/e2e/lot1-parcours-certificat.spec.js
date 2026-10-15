import { expect, test } from '@playwright/test'
import { acceptConsent, EMP_A, signIn } from './auth.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/714b2012-8130-4f37-90c0-b587e71ccc7a/scratchpad/captures'
const PDF = { name: 'licence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n' + '0'.repeat(2000)) }

/**
 * Lot 1, parcours « certificat » de bout en bout (EMP-A) :
 * US-204 dépôt fermé et liste de ce qui reste → US-202 sections 1 et 2 → US-203 section 3 →
 * US-301 dépôt signé → US-302 remerciement et avis → US-303 statut « Reçu ».
 */
test('compléter son profil puis déposer un certificat', async ({ page }) => {
  // US-207 : première connexion → « Avant de commencer » (écran 05), puis l'accueil (écran 06).
  await signIn(page, EMP_A, { consent: false })
  await acceptConsent(page)
  await expect(page.getByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/lot1-accueil-390.png`, fullPage: true })
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })

  // US-204 : dépôt fermé tant que le profil n'est pas complet.
  await nav.getByRole('link', { name: 'Mes certificats' }).click()
  await expect(page.getByRole('heading', { name: /Il reste 8 informations à compléter/ })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/lot1-verrou-390.png`, fullPage: true })
  await page.getByRole('link', { name: /Ajouter mon téléphone/ }).click()

  // US-202 : section 1 (la mention a déjà été acceptée).
  await expect(page.getByRole('heading', { name: 'Mes coordonnées' })).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Enregistré dans votre profil.')).toBeVisible()

  // Section 2, qui enchaîne sur la section 3.
  await page.goto('/profil/contact-etudes')
  await page.getByLabel('Nom complet de la personne à contacter').fill('Marie Joseph')
  await page.getByLabel('Lien avec vous').selectOption({ label: 'Parent' })
  await page.getByLabel("Téléphone d'urgence").fill('4812 8901')
  await page.getByRole('radio', { name: /Licence/ }).check()
  await page.getByRole('button', { name: /Enregistrer et continuer/ }).click()

  // US-203 : confirmer l'agence et le poste, signaler la date d'embauche.
  await expect(page.getByRole('heading', { name: 'Mes informations RH' })).toBeVisible()
  for (const name of ["Agence d'affectation", 'Poste actuel']) {
    const card = page.getByRole('region', { name })
    await card.getByRole('button', { name: "C'est exact" }).click()
    await expect(card.getByText(/^Confirmé le/)).toBeVisible()
  }
  const hire = page.getByRole('region', { name: "Date d'embauche" })
  await hire.getByRole('button', { name: 'Signaler une erreur' }).click()
  await hire.getByLabel('Quelle est la bonne information ?').fill('03/06/2017')
  await hire.getByRole('button', { name: 'Envoyer aux RH' }).click()
  await expect(hire.getByText(/^Signalé aux RH le/)).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/lot1-informations-rh-390.png`, fullPage: true })
  await page.getByRole('button', { name: /Valider et terminer mon profil/ }).click()
  await expect(page).toHaveURL(/\/accueil$/)
  await expect(page.getByRole('heading', { name: 'Votre dossier est complet à 100 %' })).toBeVisible()

  // US-301 : le dépôt s'ouvre, depuis l'accueil.
  await page.getByRole('region', { name: 'Dépôt de certificats' }).getByRole('link', { name: /Déposer un certificat/ }).click()
  await page.getByLabel('Choisir un fichier').setInputFiles(PDF)
  await expect(page.getByRole('region', { name: 'Fichier choisi' })).toContainText('licence.pdf')
  await page.getByRole('group', { name: 'Type de document' }).locator('label', { hasText: 'Diplôme' }).click()
  await expect(page.getByRole('radio', { name: /Diplôme/ })).toBeChecked()
  await page.getByLabel("Niveau d'études associé").selectOption({ label: 'Licence' })
  await page.getByLabel('Intitulé exact').fill('Licence en sciences comptables')
  await page.getByLabel("Établissement d'enseignement").fill("Université d'État d'Haïti")
  await page.getByLabel("Année d'obtention").fill('2019')
  await page.getByLabel("Domaine d'études").selectOption({ label: 'Comptabilité' })
  await page.screenshot({ path: `${CAPTURES}/lot1-depot-390.png`, fullPage: true })
  await page.getByRole('button', { name: /Envoyer mon certificat/ }).click()

  // US-302 : remerciement, ce que ça débloque, avis.
  await expect(page.getByRole('heading', { name: 'Merci, Jean !' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ce que ce certificat débloque' })).toContainText('Licence')
  await page.getByRole('button', { name: /Facile/ }).click()
  await expect(page.getByText('Merci pour votre avis.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/lot1-merci-390.png`, fullPage: true })

  // US-303 : le certificat apparaît « Reçu ».
  await page.getByRole('link', { name: 'Voir mes certificats' }).click()
  const list = page.getByRole('list', { name: 'Certificats déposés' })
  await expect(list).toContainText('Licence en sciences comptables')
  await expect(list).toContainText('Reçu')
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/lot1-certificats-1280.png`, fullPage: true })
})
