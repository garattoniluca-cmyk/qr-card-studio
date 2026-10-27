// Supporto ai test di integrazione: database qrcard_test_<id> e cartella uploads temporanea,
// creati per ogni file di test e distrutti alla fine anche in caso di errore.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { buildConfig, loadEnvFile } from '../src/config.js';
import { createPool } from '../src/db.js';
import { runMigrations } from '../src/migrate.js';
import { createApp } from '../src/app.js';

loadEnvFile();

export const TEST_PASSWORD = 'password-di-test-' + crypto.randomBytes(4).toString('hex');
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

/** Interfacce di rete simulate per un IP LAN prevedibile. */
export const FAKE_INTERFACES = {
  'vEthernet (WSL)': [{ address: '172.20.0.1', family: 'IPv4', internal: false }],
  Ethernet: [{ address: '192.168.1.20', family: 'IPv4', internal: false }],
};

function testDbBase() {
  const env = process.env;
  if (!env.TEST_DB_USER) throw new Error('TEST_DB_USER mancante in server/.env');
  return { host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3307), user: env.TEST_DB_USER, password: env.TEST_DB_PASSWORD };
}

export async function createTestEnv({ env = {}, interfaces = FAKE_INTERFACES } = {}) {
  const name = `qrcard_test_${crypto.randomBytes(6).toString('hex')}`;
  const base = testDbBase();
  const admin = await mysql.createConnection(base);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const db = { ...base, database: name };
  await runMigrations(db);
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qrcard-uploads-'));
  const config = buildConfig(
    { ...env, PORT: env.PORT || '8080' },
    { db, uploadDir, adminPasswordHash: TEST_HASH, sessionSecret: 'segreto-test', clientDist: path.join(uploadDir, 'nessun-dist') },
  );
  const pool = createPool(db);
  const app = createApp({ pool, config, interfaces });

  async function cleanup() {
    await pool.end().catch(() => {});
    const c = await mysql.createConnection(base);
    await c.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await c.end();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }

  async function login() {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ password: TEST_PASSWORD }).expect(200);
    return agent;
  }

  return { name, db, pool, app, config, uploadDir, cleanup, login };
}

/** Decodifica un QR (PNG o SVG) con jsQR dopo la rasterizzazione con sharp. */
export async function decodeQr(buffer) {
  const sharp = (await import('sharp')).default;
  const jsQR = (await import('jsqr')).default;
  const { data, info } = await sharp(buffer).flatten({ background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { text: jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null, width: info.width, height: info.height };
}
