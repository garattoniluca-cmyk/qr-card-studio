import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Browser installati dentro la cartella del progetto (node_modules/playwright-core/.local-browsers).
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

export const E2E_PORT = Number(process.env.E2E_PORT || 18080);

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: 'test-results/playwright',
  reporter: [['list'], ['json', { outputFile: path.join('.reports', 'e2e.json') }]],
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    screenshot: 'only-on-failure',
    trace: 'off',
    locale: 'it-IT',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
