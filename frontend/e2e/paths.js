import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Dossier de données des tests E2E (base SQLite fictive), partagé par `start-server.mjs` et `auth.js`. */
export const E2E_DATA_DIR = join(tmpdir(), 'acme-e2e-pam')
