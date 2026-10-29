// Démarre l'API pour les tests E2E : CSV fictif, données dans un dossier temporaire neuf,
// compte admin de test (admin / Admin-Test-2026).
//
// Tous les tests E2E partagent cette base : chaque test utilise son propre employé fictif.
//   us1003 → EMP-B (connexion par code)                 us04 → EMP-D1 (ne soumet jamais)
//   us23 → compte admin e2e.marie (créé par le test)
//   us206 → EMP-B (anciennes adresses du MVP)
//   lot1-parcours-certificat → EMP-A (profil complet, dépôt d’un certificat)
//   us201 → EMP-H1 (lit son dossier)        us202 → EMP-D1 (dossier : consentement, coordonnées, contact, études)
//   us113 → EMP-H2 (parcourt les écrans employé sur ordinateur et téléphone, sans rien enregistrer)
//   us114 → EMP-H2 (lit la frise de « Ma carrière », sans rien enregistrer)
//   us116 → EMP-H2 (signale une erreur sur sa date d’embauche ; l’admin la voit dans ses notifications)
//   us125 → EMP-H2 (reste inactif avec une horloge simulée, sans rien enregistrer)
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { E2E_DATA_DIR } from './paths.js'

export const ADMIN_PASSWORD = 'Admin-Test-2026'

const backendDir = resolve(import.meta.dirname, '../../backend')
const python = join(backendDir, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
// US-1003 : dossier fixe, vidé à chaque démarrage, pour que `signIn` (auth.js) retrouve la base des tests.
const dataDir = E2E_DATA_DIR
rmSync(dataDir, { recursive: true, force: true })
mkdirSync(dataDir, { recursive: true })
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
      ADMIN_MFA_REQUIRED: 'false', // US-112 : réglage par défaut, quel que soit backend/.env
    },
  },
)

const stop = () => server.kill()
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('exit', stop)
