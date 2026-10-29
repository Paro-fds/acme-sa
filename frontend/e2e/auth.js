import { expect } from '@playwright/test'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { E2E_DATA_DIR } from './paths.js'

/**
 * US-1003 : connexion en trois étapes (`/connexion`) : code employé et date de naissance, courriel masqué,
 * puis le code reçu. Sur le serveur des tests (poste local), aucun courriel ne part : le code s'affiche à l'écran.
 */

/** Étape 1 : code employé et date de naissance (person.birthDate : AAAA-MM-JJ, tapée JJMMAAAA, US-1014). */
export async function identify(page, person) {
  await page.goto('/connexion')
  await page.getByLabel('Code employé').fill(person.code)
  const [year, month, day] = person.birthDate.split('-')
  await page.getByLabel('Date de naissance', { exact: true }).fill(`${day}${month}${year}`)
  await page.getByRole('button', { name: 'Continuer' }).click()
}

/** Étapes 2 et 3 : demande le code, le lit à l'écran (poste local) et le saisit. */
export async function enterCode(page) {
  await page.getByRole('button', { name: 'Recevoir mon code par courriel' }).click()
  const shown = await page.getByRole('status').filter({ hasText: 'Code :' }).textContent()
  const code = shown.match(/\d{6}/)[0]
  await page.getByLabel('Code reçu').fill(code)
  await page.getByRole('button', { name: 'Me connecter' }).click()
  return code
}

/**
 * Les tests partagent une base : plusieurs se connectent avec le même employé, à quelques secondes d'intervalle.
 * Pour ne pas buter sur les limites d'envoi des codes (60 secondes entre deux codes, 4 par 15 minutes), qui restent
 * actives, on efface l'historique des codes et le verrouillage de cet employé dans la base fictive des tests.
 */
export function resetLoginState(person) {
  const database = new DatabaseSync(join(E2E_DATA_DIR, 'portail.db'))
  try {
    for (const table of ['employee_login_code', 'employee_account']) {
      const exists = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
      if (exists) database.prepare(`DELETE FROM ${table} WHERE employee_id = ?`).run(person.id)
    }
    // US-1015 : tous les tests partagent l'adresse locale ; on efface ses échecs, et ceux du code de cette personne.
    if (database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'employee_login_lock'").get()) {
      database.prepare("DELETE FROM employee_login_lock WHERE key LIKE 'ip#%' OR key = ?").run(`code#${person.code}`)
      database.prepare('DELETE FROM employee_login_captcha').run()
    }
  } finally {
    database.close()
  }
}

const LANDING = /\/(accueil|avant-de-commencer)$/

/** Après la connexion, l'accueil redirige vers « Avant de commencer » la première fois : on attend la page finale. */
export async function landed(page) {
  await expect(page).toHaveURL(LANDING)
  await expect(page.getByRole('heading', { name: /^(Avant de commencer|Bonjour .+)$/ })).toBeVisible()
}

/** US-202 CA-01, US-207 : à la première connexion, « Avant de commencer » ; on accepte la mention pour continuer. */
export async function acceptConsent(page) {
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte/ }).check()
  await page.getByRole('button', { name: /Continuer vers mon espace/ }).click()
  await expect(page).toHaveURL(/\/accueil$/)
}

/**
 * Connexion complète. L'employé arrive sur « Accueil » (US-207) ; `consent: false` le laisse sur
 * « Avant de commencer » s'il n'a pas encore accepté.
 */
export async function signIn(page, person, { consent = true } = {}) {
  resetLoginState(person)
  await identify(page, person)
  await enterCode(page)
  await landed(page)
  if (consent && page.url().endsWith('/avant-de-commencer')) await acceptConsent(page)
}

// Employés fictifs du CSV de test (docs/03-plan-implementation.md §4.1), un par test. `id` : identifiant de Vault.
export const EMP_A = { id: '1001', code: 'AC-1001', lastName: 'JOSEPH', firstName: 'Jean', birthDate: '1996-03-15' }
export const EMP_B = { id: '1008', code: 'AC-1008', lastName: 'BAPTISTE', firstName: 'Marc', birthDate: '2000-12-01' }
export const EMP_D1 = { id: '1004', code: 'AC-1004', lastName: 'LOUIS', firstName: 'Paul', birthDate: '1988-01-10' }
export const EMP_H1 = { id: '1002', code: 'AC-1002', lastName: 'PIERRE', firstName: 'Marie', birthDate: '1990-07-02' }
export const EMP_H2 = { id: '1003', code: 'AC-1003', lastName: 'PIERRE', firstName: 'Marie', birthDate: '1985-11-20' }
// EMP-E (AC-1007) n'a pas de courriel dans l'export : il ne peut se connecter qu'avec WhatsApp (US-1004).
