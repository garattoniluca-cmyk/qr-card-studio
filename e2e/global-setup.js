// Avvia l'app vera (Express + SPA buildata) su un database qrcard_test_* dedicato.
// Il database e la cartella uploads temporanea vengono distrutti alla fine, anche in caso di errore.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createTestEnv, TEST_PASSWORD } from '../server/test/helpers.js';
import { PROJECT_ROOT } from '../server/src/config.js';
import { E2E_PORT } from '../playwright.config.js';

export default async function globalSetup() {
  const dist = path.join(PROJECT_ROOT, 'client', 'dist', 'index.html');
  if (process.env.E2E_SKIP_BUILD !== '1' || !fs.existsSync(dist)) {
    execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'ignore' });
  }
  const env = await createTestEnv({
    interfaces: undefined,
    overrides: { clientDist: path.join(PROJECT_ROOT, 'client', 'dist'), port: E2E_PORT, publicPort: E2E_PORT },
  });
  const server = await new Promise((resolve, reject) => {
    const s = env.app.listen(E2E_PORT, '0.0.0.0', () => resolve(s));
    s.on('error', reject);
  });

  Object.assign(process.env, {
    E2E_BASE_URL: `http://127.0.0.1:${E2E_PORT}`,
    E2E_ADMIN_PASSWORD: TEST_PASSWORD,
    E2E_DB_JSON: JSON.stringify(env.db),
    E2E_UPLOAD_DIR: env.uploadDir,
  });

  return async () => {
    await new Promise((r) => server.close(r));
    server.closeAllConnections?.();
    await env.cleanup();
  };
}
