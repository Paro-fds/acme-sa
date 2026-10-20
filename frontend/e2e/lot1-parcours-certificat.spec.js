import { expect, test } from '@playwright/test'
import { adminLogin } from './admin.js'
import { acceptConsent, EMP_A, signIn } from './auth.js'

const CAPTURES = 'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/a3ac3411-0311-4109-b6a8-9aa1d82a8e84/scratchpad/captures'
const REFONTE =
  'C:/Users/LENOVO/AppData/Local/Temp/claude/c--Users-LENOVO-OneDrive-Desktop-ACME-SA-app-web/7be86a6f-dfd2-47a0-9b44-97dbe2e73527/scratchpad/captures'
const PDF = { name: 'licence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n' + '0'.repeat(2000)) }

/**
 * Lot 1, parcours « certificat » de bout en bout (EMP-A) :
 * US-204 dépôt fermé et liste de ce qui reste → US-202 sections 1 et 2 → US-203 section 3 →
 * US-301 dépôt signé → US-302 remerciement et avis → US-303 statut « Reçu » →
 * US-130 les RH demandent une correction, l'employé corrige et renvoie.
 */
test('compléter son profil puis déposer un certificat', async ({ browser, page }) => {
  test.setTimeout(120000)
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

  // US-301 : le dépôt s'ouvre, depuis l'accueil.
  await page.getByRole('link', { name: /Déposer un certificat/ }).click()
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

  // US-130 : les RH demandent une correction (motif et commentaire)…
  // US-133 : par la file de validation et l'écran d'examen.
  const admin = await (await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: { width: 1280, height: 900 } })).newPage()
  await adminLogin(admin)
  await admin.goto('/admin/validation')
  const queue = admin.getByRole('table', { name: 'Certificats en attente' })
  const row = queue.getByRole('row').filter({ hasText: 'Licence en sciences comptables' }).filter({ hasText: 'Jean' })
  await expect(row).toContainText('Jour')
  await admin.screenshot({ path: `${REFONTE}/us133-file-1280.png`, fullPage: true })
  await row.getByRole('link', { name: 'Examiner' }).click()
  await expect(admin.getByRole('heading', { name: 'Licence en sciences comptables', level: 2 })).toBeVisible()
  await expect(admin.getByText(/· pris par vous$/)).toBeVisible()
  await expect(admin.getByRole('region', { name: 'Ce que l’employé a déclaré' }).getByLabel('Niveau')).toHaveValue('LICENCE')
  await admin.screenshot({ path: `${REFONTE}/us133-examen-1280.png`, fullPage: true })
  await admin.setViewportSize({ width: 390, height: 844 })
  expect(await admin.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await admin.screenshot({ path: `${REFONTE}/us133-examen-390.png`, fullPage: true })
  await admin.getByRole('button', { name: 'Rejeter…' }).click()
  await admin.getByLabel(/Commentaire pour l’employé/).fill('La photo est floue.')
  await admin.getByRole('button', { name: 'Confirmer le rejet' }).click()
  await expect(admin.getByRole('heading', { name: 'File de validation des certificats', level: 1 })).toBeVisible()
  expect(await admin.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await admin.screenshot({ path: `${REFONTE}/us133-file-390.png`, fullPage: true })
  await admin.close()

  // … l'employé voit le message, et l'avancement dans « Mes certificats ».
  await page.reload()
  const corrected = page.getByRole('heading', { name: 'Licence en sciences comptables', level: 3 }).locator('xpath=ancestor::li[1]')
  await expect(corrected).toContainText('Message des RH : Document illisible ou de mauvaise qualité. La photo est floue.')
  await page.screenshot({ path: `${REFONTE}/us130-certificats-1280.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${REFONTE}/us130-certificats-390.png`, fullPage: true })

  // Corriger et renvoyer : le formulaire est rempli, seul le fichier est à choisir.
  await corrected.getByRole('link', { name: 'Corriger et renvoyer' }).click()
  await expect(page.getByRole('region', { name: 'Vous corrigez « Licence en sciences comptables »' })).toBeVisible()
  await expect(page.getByLabel('Intitulé exact')).toHaveValue('Licence en sciences comptables')
  await page.getByLabel('Choisir un fichier').setInputFiles(PDF)
  await page.screenshot({ path: `${REFONTE}/us130-corriger-390.png`, fullPage: true })
  await page.getByRole('button', { name: /Renvoyer mon certificat/ }).click()
  await expect(page.getByRole('heading', { name: 'Merci, Jean !' })).toBeVisible()

  // Le nouveau est « Reçu », l'ancien reste archivé comme preuve.
  await page.getByRole('link', { name: 'Voir mes certificats' }).click()
  const filters = page.getByRole('group', { name: 'Filtrer mes certificats' })
  await expect(filters.getByRole('button', { name: /^À corriger · 0$/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Certificats déposés' })).toContainText('Archivé (remplacé)')
  await expect(page.getByRole('list', { name: 'Avancement' }).first()).toBeVisible()
})
