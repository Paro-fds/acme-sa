// Démarre l'API pour les tests E2E : CSV fictif, données dans un dossier temporaire neuf,
// compte admin de test (admin / Admin-Test-2026).
//
// Tous les tests E2E partagent cette base : chaque test utilise son propre employé fictif.
//   us02 → EMP-H1           us03 → EMP-B            us04 → EMP-E (ne soumet jamais)
//   us23 → compte admin e2e.marie (créé par le test)
//   us206 → EMP-B (anciennes adresses du MVP)
//   lot1-parcours-certificat → EMP-A (profil complet, dépôt d’un certificat)
//   us201 → EMP-H1 (lit son dossier)        us202 → EMP-E (dossier : consentement, coordonnées, contact, études)
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export const ADMIN_PASSWORD = 'Admin-Test-2026'

const backendDir = resolve(import.meta.dirname, '../../backend')
const python = join(backendDir, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const dataDir = mkdtempSync(join(tmpdir(), 'acme-e2e-'))
const adminPasswordHash = execFileSync(python, ['-m', 'app.tools.hash_password', ADMIN_PASSWORD], {
  cwd: backendDir,
  encoding: 'utf-8',
}).trim()

const server = spawn(
  python,
  ['-m', 'uvicorn', 'app.main:create_app', '--factory', '--host', '127.0.0.1', '--port', '8001'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ACME_CSV_PATH: join(backendDir, 'tests/fixtures/employees_test.csv'),
      ACME_DATA_DIR: dataDir,
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD_HASH: adminPasswordHash,
    },
  },
)

const stop = () => server.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('exit', stop)
