// Migrazioni SQL versionate (server/migrations/NNN_descrizione.sql) con tabella di tracciamento.
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { SERVER_ROOT } from './config.js';

export const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'migrations');

/** Divide un file SQL in istruzioni (nessun ; dentro le stringhe nei nostri file). */
export function splitSql(sql) {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listMigrationFiles(dir = MIGRATIONS_DIR) {
  const files = await fs.readdir(dir);
  return files.filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
}

/**
 * Applica le migrazioni pendenti. `dbConfig` è la configurazione mysql2 del database di destinazione.
 * Restituisce l'elenco dei file applicati in questa esecuzione.
 */
export async function runMigrations(dbConfig, { log = () => {} } = {}) {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(200) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));
    const applied = [];
    for (const file of await listMigrationFiles()) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      for (const stmt of splitSql(sql)) await conn.query(stmt);
      await conn.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      applied.push(file);
      log(`migrazione applicata: ${file}`);
    }
    return applied;
  } finally {
    await conn.end();
  }
}
