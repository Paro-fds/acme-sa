import { expect, test } from '@playwright/test'
import { acceptConsent, EMP_A, signIn } from './auth.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/a3ac3411-0311-4109-b6a8-9aa1d82a8e84/scratchpad/captures'
const REFONTE =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/7be86a6f-dfd2-47a0-9b44-97dbe2e73527/scratchpad/captures'
const PDF = { name: 'licence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n' + '0'.repeat(2000)) }

/**
 * Lot 1, parcours « certificat » de bout en bout (EMP-A) :
 * US-204 dépôt fermé et liste de ce qui reste → US-202 sections 1 et 2 → US-203 section 3 →
 * US-1008 dépôt dans Carrières, « À compléter » dans « Mes certificats » ; doublon refusé.
 * (La validation se fait dans Carrières : l'ancienne file de PAM sera retirée avec US-1010.)
 */
test('compléter son profil puis déposer un certificat', async ({ page }) => {
  test.setTimeout(120000)
  // US-207 : première connexion → « Avant de commencer » (écran 05), puis l'accueil (écran 06).
  await signIn(page, EMP_A, { consent: false })
  await acceptConsent(page)
  await expect(page.getByRole('heading', { name: 'Bonjour Jean' })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/lot1-accueil-390.png`, fullPage: true })
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })

  // US-204 : dépôt fermé tant que le profil n'est pas complet.
  await nav.getByRole('link', { name: 'Mes certificats' }).click()
  await expect(page.getByRole('heading', { name: /Il reste 6 informations à compléter/ })).toBeVisible()
  await page.screenshot({ path: `${CAPTURES}/lot1-verrou-390.png`, fullPage: true })
  await page.getByRole('link', { name: /Ajouter mon adresse/ }).click()

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
  // US-136 : dossier complet, l'accueil allégé : trois chiffres au plus, plus de tuile « Mon dossier ».
  const tiles = page.getByRole('region', { name: 'Vos chiffres' })
  await expect(tiles.getByRole('link', { name: /Mes certificats/ })).toBeVisible()
  await expect(tiles.getByRole('link', { name: /Mon dossier/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us123-accueil-complet-390.png`, fullPage: true })
  // US-136 : le poste mis en avant reste ; ni activité récente ni dates à retenir.
  await expect(page.getByRole('region', { name: 'Poste ouvert pour vous' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Activité récente' })).toHaveCount(0)
  await page.screenshot({ path: `${REFONTE}/us136-accueil-390.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.reload()
  await expect(page.getByRole('region', { name: 'Poste ouvert pour vous' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Dates à retenir' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us123-accueil-complet-1280.png`, fullPage: true })
  await page.screenshot({ path: `${REFONTE}/us136-accueil-1280.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })

  // US-1008 : le dépôt s'ouvre depuis l'accueil et entre dans Carrières, « À compléter ».
  await page.getByRole('link', { name: /Déposer un certificat/ }).click()
  await expect(page.getByRole('heading', { name: 'Déposer une pièce' })).toBeVisible()
  await page.getByLabel('Choisir un fichier').setInputFiles(PDF)
  await expect(page.getByRole('region', { name: 'Fichier choisi' })).toContainText('licence.pdf')
  await page.getByLabel('Intitulé (facultatif)').fill('Licence en sciences comptables (copie)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${CAPTURES}/us1008-depot-390.png`, fullPage: true })
  await page.getByRole('button', { name: 'Déposer' }).click()

  // US-1008 : retour à « Mes certificats », la pièce en tête, à compléter par la DRH.
  await expect(page.getByText('Pièce déposée. La DRH va la compléter, puis la valider.')).toBeVisible()
  const list = page.getByRole('list', { name: 'Mes pièces' })
  const newest = list.getByRole('listitem').first()
  await expect(newest).toContainText('Licence en sciences comptables (copie)')
  await expect(newest).toContainText('À compléter')
  await expect(list).toContainText('Approuvée')  // la licence déjà recueillie par la DRH (base fictive)
  await page.screenshot({ path: `${CAPTURES}/us1008-certificats-390.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
  await page.screenshot({ path: `${CAPTURES}/us1008-certificats-1280.png`, fullPage: true })

  // Le même fichier, une seconde fois : refusé, près du fichier.
  await page.goto('/certificats/deposer')
  await page.getByLabel('Choisir un fichier').setInputFiles(PDF)
  await page.getByRole('button', { name: 'Déposer' }).click()
  await expect(page.getByRole('alert')).toContainText('Vous avez déjà déposé ce fichier.')
})
