import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Ports de développement réglables dans frontend/.env (non versionné) : le dossier de la V2 utilise
  // ACME_API_PORT=8002 et ACME_DEV_PORT=5174, pour ne jamais appeler le MVP en service (:8000).
  // Sans préfixe VITE_, ces variables ne sont pas exposées au navigateur.
  const env = loadEnv(mode, import.meta.dirname, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: Number(env.ACME_DEV_PORT || 5173),
      strictPort: true,
      // En développement, l'API FastAPI tourne sur :8000 (ou ACME_API_PORT)
      proxy: { '/api': `http://localhost:${env.ACME_API_PORT || 8000}` },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
      // Formulaires longs remplis touche par touche (dépôt de certificat) : 5 s ne suffisent pas quand toute la suite tourne.
      testTimeout: 15000,
    },
  }
})
