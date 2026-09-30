import { defineConfig } from '@playwright/test';

// Prueba e2e mínima contra el build de producción (`npm run build` antes) en modo demo:
// sin base de datos, sin claves y sin escribir nada. Puerto distinto del de desarrollo.
const PORT = process.env.E2E_PORT || 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { CATALOG_PROVIDER: 'demo', DATABASE_URL: '', TMDB_API_KEY: '' },
  },
});
