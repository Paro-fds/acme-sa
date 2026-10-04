import { defineConfig, devices } from '@playwright/test'

/**
 * Tests bout en bout : application complète (FastAPI + frontend compilé) sur :8001,
 * avec le CSV fictif et un dossier de données temporaire. Viewport mobile par défaut.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8001',
    locale: 'fr-FR',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run build && node e2e/start-server.mjs',
    url: 'http://127.0.0.1:8001/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
