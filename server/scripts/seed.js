// npm run seed — crea una scheda di esempio passando dalla pipeline di upload.
import fs from 'node:fs/promises';
import { buildConfig, loadEnvFile } from '../src/config.js';
import { createPool } from '../src/db.js';
import { createDemoCard } from '../src/seed.js';

loadEnvFile();
const config = buildConfig();
await fs.mkdir(config.uploadDir, { recursive: true });
const pool = createPool(config.db);
try {
  const id = await createDemoCard(pool, config.uploadDir);
  console.log(`Scheda di esempio creata (id ${id}).`);
} finally {
  await pool.end();
}
