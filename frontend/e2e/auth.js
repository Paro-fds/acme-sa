import { expect } from '@playwright/test'

/** US-101 : connexion en un écran (`/connexion`) et création du mot de passe (`/connexion/premiere`). */

export const PASSWORD = 'Bonjour-2026'

async function fillIdentity(page, person) {
  await page.getByLabel('Nom de famille').fill(person.lastName)
  await page.getByLabel('Prénom').fill(person.firstName)
  await page.getByLabel('Date de naissance').fill(person.birthDate)
}

/** Première connexion : crée le mot de passe et ouvre le profil. */
export async function createPassword(page, person, password = PASSWORD, confirmation = password) {
  await page.goto('/connexion/premiere')
  await fillIdentity(page, person)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByLabel('Confirmer le mot de passe', { exact: true }).fill(confirmation)
  await page.getByRole('button', { name: 'Créer mon mot de passe' }).click()
}

/** Connexion avec un mot de passe existant. */
export async function login(page, person, password = PASSWORD) {
  await page.goto('/connexion')
  await fillIdentity(page, person)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Me connecter' }).click()
}

/** Connexion, ou création du mot de passe si l'employé n'en a pas encore (tests rejoués sur une base partagée). */
export async function signIn(page, person, password = PASSWORD) {
  await login(page, person, password)
  const opened = await page
    .waitForURL(/\/profil$/, { timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (!opened) await createPassword(page, person, password)
  await expect(page).toHaveURL(/\/profil$/)
}

// Employés fictifs du CSV de test (docs/epics/README.md), un par test.
export const EMP_A = { lastName: 'JOSEPH', firstName: 'Jean', birthDate: '1996-03-15' }
export const EMP_B = { lastName: 'BAPTISTE', firstName: 'Marc', birthDate: '2000-12-01' }
export const EMP_E = { lastName: 'ÉTIENNE', firstName: 'Rosé', birthDate: '1979-09-30' }
export const EMP_H1 = { lastName: 'PIERRE', firstName: 'Marie', birthDate: '1990-07-02' }
export const EMP_H2 = { lastName: 'PIERRE', firstName: 'Marie', birthDate: '1985-11-20' }
