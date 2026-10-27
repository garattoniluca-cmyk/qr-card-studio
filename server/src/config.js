// Lettura della configurazione da variabili d'ambiente (server/.env).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

export function loadEnvFile() {
  dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });
}

function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function int(v, def) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/** Costruisce l'oggetto di configurazione. `overrides` serve ai test. */
export function buildConfig(env = process.env, overrides = {}) {
  const uploadDir = env.UPLOAD_DIR || 'uploads';
  const cfg = {
    port: int(env.PORT, 8080),
    host: env.HOST || '0.0.0.0',
    publicPort: int(env.PUBLIC_PORT, 0) || null,
    publicBaseUrlEnv: (env.PUBLIC_BASE_URL || '').trim() || null,
    trustProxy: bool(env.TRUST_PROXY),
    db: {
      host: env.DB_HOST || '127.0.0.1',
      port: int(env.DB_PORT, 3307),
      user: env.DB_USER || 'qrcard_app',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'infoqrshow',
    },
    adminPasswordHash: env.ADMIN_PASSWORD_HASH || '',
    sessionSecret: env.SESSION_SECRET || '',
    uploadDir: path.isAbsolute(uploadDir) ? uploadDir : path.join(SERVER_ROOT, uploadDir),
    maxUploadBytes: int(env.MAX_UPLOAD_MB, 10) * 1024 * 1024,
    clientDist: env.CLIENT_DIST || path.join(PROJECT_ROOT, 'client', 'dist'),
    logRequests: bool(env.LOG_REQUESTS),
  };
  return { ...cfg, ...overrides, db: { ...cfg.db, ...(overrides.db || {}) } };
}
