// npm run migrate — applica le migrazioni pendenti al database configurato in server/.env.
import { buildConfig, loadEnvFile } from '../src/config.js';
import { runMigrations } from '../src/migrate.js';

loadEnvFile();
const { db } = buildConfig();
try {
  const applied = await runMigrations(db, { log: (m) => console.log(m) });
  console.log(applied.length ? `Migrazioni applicate: ${applied.length}` : 'Nessuna migrazione da applicare.');
} catch (e) {
  console.error(`Migrazione fallita: ${e.code || ''} ${e.message}`);
  process.exit(1);
}
