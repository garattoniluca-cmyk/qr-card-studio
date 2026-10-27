// npm run media:cleanup [-- --dry-run] [--min-age=MINUTI]
// Rimuove i media non usati da nessuna scheda (file su disco e record).
import { buildConfig, loadEnvFile } from '../src/config.js';
import { createPool } from '../src/db.js';
import { deleteMediaRows, findOrphans } from '../src/media.js';

loadEnvFile();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const ageArg = args.find((a) => a.startsWith('--min-age='));
const minAgeMinutes = ageArg ? Number(ageArg.split('=')[1]) : 60;

const config = buildConfig();
const pool = createPool(config.db);
try {
  const orphans = await findOrphans(pool, { minAgeMinutes });
  for (const o of orphans) console.log(`${dryRun ? '[prova] ' : ''}orfano: ${o.path_relative} (${o.original_name})`);
  if (!dryRun) await deleteMediaRows(pool, config.uploadDir, orphans);
  console.log(`${orphans.length} media orfani ${dryRun ? 'trovati (nessuna modifica)' : 'rimossi'}.`);
} finally {
  await pool.end();
}
