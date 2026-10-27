// Pool di connessioni MySQL (mysql2/promise). Solo query parametrizzate.
import mysql from 'mysql2/promise';

export function createPool(dbConfig) {
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4_unicode_ci',
    dateStrings: false,
    timezone: 'Z',
    multipleStatements: false,
  });
}

/** Controllo rapido di raggiungibilità del database. */
export async function pingDb(pool) {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}
