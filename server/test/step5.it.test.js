import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestEnv, decodeQr, FAKE_INTERFACES } from './helpers.js';

async function listFilesRecursive(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFilesRecursive(p)));
    else out.push(p);
  }
  return out;
}

describe('@step5 @it QR e URL pubblico — integrazione', () => {
  let env;
  let agent;
  let card;

  beforeAll(async () => {
    env = await createTestEnv();
    agent = await env.login();
    card = (await agent.post('/api/cards').send({ title: 'Scheda QR', sku: 'QR-1' }).expect(201)).body.card;
  });
  afterAll(async () => env?.cleanup());

  it('T5.3 — qr.png contiene esattamente l\'URL canonico e rispetta size', async () => {
    const res = await agent.get(`/api/cards/${card.id}/qr.png?size=300`).buffer(true).expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    const qr = await decodeQr(res.body);
    expect(qr.text).toBe(`http://192.168.1.20:8080/p/${card.publicId}`);
    expect(qr.width).toBe(300);
    const small = await decodeQr((await agent.get(`/api/cards/${card.id}/qr.png?size=200`).buffer(true)).body);
    expect(small.width).toBe(200);
  });

  it('T5.3 — qr.svg rasterizzato contiene l\'URL canonico e rispetta size', async () => {
    const res = await agent.get(`/api/cards/${card.id}/qr.svg?size=400`).buffer(true).expect(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(res.body.toString()).toMatch(/width="400"/);
    const qr = await decodeQr(res.body);
    expect(qr.text).toBe(`http://192.168.1.20:8080/p/${card.publicId}`);
  });

  it('T5.4 — con custom_qr_url valorizzato il QR codifica quell\'URL', async () => {
    const other = (await agent.post('/api/cards').send({ title: 'Personalizzata', customQrUrl: 'https://negozio.example.com/prodotto?id=7' }).expect(201)).body.card;
    const qr = await decodeQr((await agent.get(`/api/cards/${other.id}/qr.png?size=300`).buffer(true)).body);
    expect(qr.text).toBe('https://negozio.example.com/prodotto?id=7');
    const svg = await decodeQr((await agent.get(`/api/cards/${other.id}/qr.svg?size=300`).buffer(true)).body);
    expect(svg.text).toBe('https://negozio.example.com/prodotto?id=7');
  });

  it('T5.5 — cambiando PUBLIC_BASE_URL (env, poi settings) il QR cambia e cards resta invariata', async () => {
    const [before] = await env.pool.query('SELECT * FROM cards ORDER BY id');

    // 1) da env: stessa base dati, nuova istanza dell'app con PUBLIC_BASE_URL impostato
    const envApp = createApp({ pool: env.pool, config: { ...env.config, publicBaseUrlEnv: 'https://esempio.it' }, interfaces: FAKE_INTERFACES });
    const cookie = (await request(envApp).post('/api/auth/login').send({ password: (await import('./helpers.js')).TEST_PASSWORD })).headers['set-cookie'];
    const fromEnv = await decodeQr((await request(envApp).get(`/api/cards/${card.id}/qr.png`).set('Cookie', cookie).buffer(true)).body);
    expect(fromEnv.text).toBe(`https://esempio.it/p/${card.publicId}`);
    const cfgEnv = await request(envApp).get('/api/config/public-base-url').expect(200);
    expect(cfgEnv.body).toMatchObject({ url: 'https://esempio.it', source: 'env' });

    // 2) da settings: ha la precedenza su env
    await agent.put('/api/settings').send({ publicBaseUrl: 'https://schede.altro-dominio.it/' }).expect(200);
    const fromSettings = await decodeQr((await agent.get(`/api/cards/${card.id}/qr.png`).buffer(true)).body);
    expect(fromSettings.text).toBe(`https://schede.altro-dominio.it/p/${card.publicId}`);
    const cfg = await agent.get('/api/config/public-base-url').expect(200);
    expect(cfg.body).toMatchObject({ url: 'https://schede.altro-dominio.it', source: 'settings' });

    const [after] = await env.pool.query('SELECT * FROM cards ORDER BY id');
    expect(after).toEqual(before);

    // Nessun file QR su disco, nessuna colonna QR nel database
    const files = await listFilesRecursive(env.uploadDir);
    expect(files.filter((f) => /qr/i.test(path.basename(f)))).toEqual([]);
    const [cols] = await env.pool.query(
      "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME LIKE '%qr%' AND COLUMN_NAME <> 'custom_qr_url'",
      [env.name],
    );
    expect(cols).toEqual([]);

    await agent.put('/api/settings').send({ publicBaseUrl: '' }).expect(200);
    const back = await agent.get('/api/config/public-base-url');
    expect(back.body.source).toBe('auto-lan');
  });

  it('T5.6 — PUT /api/settings rifiuta URL non validi con 400 e normalizza lo slash', async () => {
    for (const bad of ['ftp://x.it', 'javascript:alert(1)', 'non un url']) {
      const r = await agent.put('/api/settings').send({ publicBaseUrl: bad }).expect(400);
      expect(r.body.error.code).toBe('INVALID_URL');
    }
    const ok = await agent.put('/api/settings').send({ publicBaseUrl: 'http://10.0.0.5:8080/' }).expect(200);
    expect(ok.body.settings.publicBaseUrl).toBe('http://10.0.0.5:8080');
    await agent.put('/api/settings').send({ publicBaseUrl: '' }).expect(200);
  });

  it('T5.3 — QR pubblico per publicId solo se la scheda è pubblicata', async () => {
    const qr = await decodeQr((await request(env.app).get(`/api/public/cards/${card.publicId}/qr.png?size=300`).buffer(true).expect(200)).body);
    expect(qr.text).toBe(`http://192.168.1.20:8080/p/${card.publicId}`);
    const hidden = (await agent.post('/api/cards').send({ title: 'Bozza', isPublished: false }).expect(201)).body.card;
    await request(env.app).get(`/api/public/cards/${hidden.publicId}/qr.png`).expect(404);
  });
});
