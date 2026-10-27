// Strumenti comuni dei test end-to-end.
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { expect } from '@playwright/test';

export const FIXTURES = path.resolve('server/test/fixtures');
export const EVIDENCE = (step) => path.resolve('test-results', `step-${step}`);

let poolPromise;
export function db() {
  poolPromise ||= Promise.resolve(mysql.createPool({ ...JSON.parse(process.env.E2E_DB_JSON), connectionLimit: 2 }));
  return poolPromise;
}

export async function query(sql, params = []) {
  const [rows] = await (await db()).query(sql, params);
  return rows;
}

/** Login via API: il cookie di sessione resta nel contesto del browser. */
export async function login(page) {
  const res = await page.request.post('/api/auth/login', { data: { password: process.env.E2E_ADMIN_PASSWORD } });
  expect(res.ok()).toBeTruthy();
}

/** Svuota schede e media (database di test). */
export async function resetData() {
  await query('UPDATE cards SET hero_media_id = NULL');
  await query('DELETE FROM media');
  await query('DELETE FROM cards');
  await query("UPDATE settings SET `value` = '' WHERE `key` = 'public_base_url'");
}

export async function createCard(page, body) {
  const res = await page.request.post('/api/cards', { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).card;
}

export async function uploadFixture(page, name) {
  const buffer = await fs.readFile(path.join(FIXTURES, name));
  const res = await page.request.post('/api/media', { multipart: { file: { name, mimeType: 'image/jpeg', buffer } } });
  expect(res.status()).toBe(201);
  return (await res.json()).media;
}

export async function saveShot(page, step, name, opts = {}) {
  await fs.mkdir(EVIDENCE(step), { recursive: true });
  return page.screenshot({ path: path.join(EVIDENCE(step), name), fullPage: true, ...opts });
}

/** Decodifica un QR da un buffer immagine (PNG/SVG) con sharp + jsQR. */
export async function decodeQrBuffer(buffer) {
  const sharp = (await import('sharp')).default;
  const jsQR = (await import('jsqr')).default;
  const { data, info } = await sharp(buffer).flatten({ background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

/** Raccoglie gli errori di console e le eccezioni non gestite di una pagina. */
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  return errors;
}
