import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { runMigrations } from '../src/migrate.js';
import { validateCardInput } from '../src/validation.js';
import { errorHandler, HttpError, notFoundApi } from '../src/errors.js';
import { insertCard, PUBLIC_ID_RE } from '../src/cards.js';
import { DEFAULT_STYLE } from '../../shared/card-options.js';
import { createTestEnv } from './helpers.js';

describe('@step1 @it Schema e migrazioni', () => {
  it('T1.1 — migrate su database vuoto crea tutte le tabelle; rieseguito non applica nulla', async () => {
    const base = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.TEST_DB_USER, password: process.env.TEST_DB_PASSWORD };
    const name = `qrcard_test_${crypto.randomBytes(5).toString('hex')}`;
    const c = await mysql.createConnection(base);
    await c.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    try {
      const first = await runMigrations({ ...base, database: name });
      expect(first).toEqual(['001_init.sql']);
      const [tables] = await c.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY t', [name]);
      expect(tables.map((r) => r.t)).toEqual(['cards', 'media', 'schema_migrations', 'settings']);
      const second = await runMigrations({ ...base, database: name });
      expect(second).toEqual([]);
      const [[{ n }]] = await c.query(`SELECT COUNT(*) AS n FROM \`${name}\`.schema_migrations`);
      expect(n).toBe(1);
    } finally {
      await c.query(`DROP DATABASE IF EXISTS \`${name}\``);
      await c.end();
    }
  });
});

describe('@step1 @it API delle schede', () => {
  let env;
  let agent;
  beforeAll(async () => {
    env = await createTestEnv();
    agent = await env.login();
  });
  afterAll(async () => env?.cleanup());

  it('T1.2 — creazione e lettura', async () => {
    const res = await agent.post('/api/cards').send({ title: 'Tavolo', subtitle: 'Rovere', price: '€ 10', sku: 'T-1', category: 'Arredo' }).expect(201);
    const { card } = res.body;
    expect(card).toMatchObject({ title: 'Tavolo', subtitle: 'Rovere', price: '€ 10', sku: 'T-1', category: 'Arredo', isPublished: true, style: DEFAULT_STYLE });
    const got = await agent.get(`/api/cards/${card.id}`).expect(200);
    expect(got.body.card.publicId).toBe(card.publicId);
  });

  it('T1.2 — modifica: i campi cambiano e updated_at avanza', async () => {
    const { card } = (await agent.post('/api/cards').send({ title: 'Prima' }).expect(201)).body;
    await new Promise((r) => setTimeout(r, 15));
    const upd = (await agent.put(`/api/cards/${card.id}`).send({ title: 'Dopo', price: '5' }).expect(200)).body.card;
    expect(upd.title).toBe('Dopo');
    expect(new Date(upd.updatedAt).getTime()).toBeGreaterThan(new Date(card.updatedAt).getTime());
    // Anche un salvataggio senza modifiche aggiorna la data
    await new Promise((r) => setTimeout(r, 15));
    const again = (await agent.put(`/api/cards/${card.id}`).send({ title: 'Dopo', price: '5' }).expect(200)).body.card;
    expect(new Date(again.updatedAt).getTime()).toBeGreaterThan(new Date(upd.updatedAt).getTime());
  });

  it('T1.2 — eliminazione; poi 404 su lettura, modifica ed eliminazione', async () => {
    const { card } = (await agent.post('/api/cards').send({ title: 'Da eliminare' }).expect(201)).body;
    await agent.delete(`/api/cards/${card.id}`).expect(200);
    await agent.get(`/api/cards/${card.id}`).expect(404);
    await agent.put(`/api/cards/${card.id}`).send({ title: 'x' }).expect(404);
    await agent.delete(`/api/cards/${card.id}`).expect(404);
    const [rows] = await env.pool.query('SELECT id FROM cards WHERE id = ?', [card.id]);
    expect(rows).toEqual([]);
  });

  it('T1.4 — public_id generato in automatico, 10 caratteri, immutabile anche dopo PUT', async () => {
    const { card } = (await agent.post('/api/cards').send({ title: 'Id' }).expect(201)).body;
    expect(card.publicId).toMatch(PUBLIC_ID_RE);
    const r = await agent.put(`/api/cards/${card.id}`).send({ title: 'Id', public_id: 'AAAAAAAAAA' }).expect(400);
    expect(r.body.error.code).toBe('PUBLIC_ID_IMMUTABLE');
    await agent.put(`/api/cards/${card.id}`).send({ title: 'Id', publicId: 'BBBBBBBBBB' }).expect(400);
    const after = (await agent.put(`/api/cards/${card.id}`).send({ title: 'Id 2' }).expect(200)).body.card;
    expect(after.publicId).toBe(card.publicId);
  });

  it('T1.4 — 1000 creazioni senza collisioni di public_id', async () => {
    const data = {
      title: 'Massa',
      subtitle: '',
      price: '',
      sku: '',
      category: 'massa',
      heroMediaId: null,
      contentHtml: '',
      style: DEFAULT_STYLE,
      customQrUrl: null,
      isPublished: true,
    };
    for (let i = 0; i < 1000; i += 50) await Promise.all(Array.from({ length: 50 }, () => insertCard(env.pool, data)));
    const [[{ n, d }]] = await env.pool.query("SELECT COUNT(*) AS n, COUNT(DISTINCT public_id) AS d FROM cards WHERE category = 'massa'");
    expect(n).toBe(1000);
    expect(d).toBe(1000);
    await env.pool.query("DELETE FROM cards WHERE category = 'massa'");
  });

  describe('ricerca', () => {
    let ids;
    beforeAll(async () => {
      await env.pool.query('DELETE FROM cards');
      const mk = async (b) => (await agent.post('/api/cards').send(b).expect(201)).body.card.id;
      ids = {
        a: await mk({ title: 'Lampada Arco', subtitle: 'Ottone', sku: 'LMP-001', category: 'Illuminazione' }),
        b: await mk({ title: 'Sedia', subtitle: 'Faggio curvato', sku: 'SD-777', category: 'Arredo' }),
        c: await mk({ title: 'Divano', subtitle: 'Velluto', sku: 'DV-1', category: 'Arredo' }),
        d: await mk({ title: 'Sconto 100%_speciale', sku: 'X_1', category: 'Varie' }),
      };
    });
    const search = async (qs) => (await agent.get(`/api/cards?${qs}`).expect(200)).body.cards.map((c) => c.id);

    it('T1.5 — q trova per titolo, sottotitolo, SKU e categoria', async () => {
      expect(await search('q=lampada')).toEqual([ids.a]);
      expect(await search('q=curvato')).toEqual([ids.b]);
      expect(await search('q=sd-777')).toEqual([ids.b]);
      expect(await search('q=illuminaz')).toEqual([ids.a]);
    });
    it('T1.5 — i caratteri % e _ sono cercati come testo', async () => {
      expect(await search(`q=${encodeURIComponent('100%_')}`)).toEqual([ids.d]);
      expect(await search(`q=${encodeURIComponent('%')}`)).toEqual([ids.d]);
    });
    it('T1.5 — filtro category, combinazione con q e categorie con conteggio', async () => {
      expect((await search('category=Arredo')).sort()).toEqual([ids.b, ids.c].sort());
      expect(await search('category=Arredo&q=velluto')).toEqual([ids.c]);
      expect(await search('category=Illuminazione&q=velluto')).toEqual([]);
      const cats = (await agent.get('/api/categories').expect(200)).body.categories;
      expect(cats).toEqual(
        expect.arrayContaining([
          { name: 'Arredo', count: 2 },
          { name: 'Illuminazione', count: 1 },
        ]),
      );
    });
    it('T1.5 — ordinamento per updated_at decrescente', async () => {
      await new Promise((r) => setTimeout(r, 15));
      await agent.put(`/api/cards/${ids.a}`).send({ title: 'Lampada Arco', category: 'Illuminazione' }).expect(200);
      const list = await search('');
      expect(list[0]).toBe(ids.a);
      const { cards } = (await agent.get('/api/cards').expect(200)).body;
      const times = cards.map((c) => new Date(c.updatedAt).getTime());
      expect([...times].sort((x, y) => y - x)).toEqual(times);
    });
  });

  it('T1.6 — SQL injection nel titolo e nella ricerca resta testo; tabelle intatte', async () => {
    const evil = "'; DROP TABLE cards; --";
    const { card } = (await agent.post('/api/cards').send({ title: evil, category: evil }).expect(201)).body;
    expect(card.title).toBe(evil);
    await agent.get(`/api/cards?q=${encodeURIComponent(evil)}&category=${encodeURIComponent(evil)}`).expect(200);
    const [tables] = await env.pool.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [env.name]);
    expect(tables.map((r) => r.t).sort()).toEqual(['cards', 'media', 'schema_migrations', 'settings']);
    const [[row]] = await env.pool.query('SELECT title FROM cards WHERE id = ?', [card.id]);
    expect(row.title).toBe(evil);
  });

  it('T1.7 — API pubblica: solo schede pubblicate; non pubblicata o inesistente → 404', async () => {
    const pub = (await agent.post('/api/cards').send({ title: 'Visibile' }).expect(201)).body.card;
    const hid = (await agent.post('/api/cards').send({ title: 'Nascosta', isPublished: false }).expect(201)).body.card;
    const r = await request(env.app).get(`/api/public/cards/${pub.publicId}`).expect(200);
    expect(r.body.card.title).toBe('Visibile');
    expect(r.body.card.id).toBeUndefined();
    await request(env.app).get(`/api/public/cards/${hid.publicId}`).expect(404);
    await request(env.app).get('/api/public/cards/zzzzzzzzzz').expect(404);
    await request(env.app).get('/api/public/cards/corto').expect(404);
  });

  it('T1.8 — emoji, accenti e € si salvano e si rileggono identici', async () => {
    const t = 'Caffè «speciale» 😀☕ — perché sì';
    const { card } = (await agent.post('/api/cards').send({ title: t, price: '€ 1.234,56', subtitle: 'ñ ü ß 漢字 🇮🇹' }).expect(201)).body;
    const got = (await agent.get(`/api/cards/${card.id}`).expect(200)).body.card;
    expect(got.title).toBe(t);
    expect(got.price).toBe('€ 1.234,56');
    expect(got.subtitle).toBe('ñ ü ß 漢字 🇮🇹');
  });
});

describe('@step1 Validazione (unitari)', () => {
  const codeOf = (body) => {
    try {
      validateCardInput(body);
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect(e.status).toBe(400);
      return e.code;
    }
  };

  it.each([
    [{}, 'TITLE_REQUIRED'],
    [{ title: '   ' }, 'TITLE_REQUIRED'],
    [{ title: 'x'.repeat(201) }, 'INVALID_TITLE'],
    [{ title: 'ok', subtitle: 'x'.repeat(301) }, 'INVALID_SUBTITLE'],
    [{ title: 'ok', sku: 'x'.repeat(81) }, 'INVALID_SKU'],
    [{ title: 'ok', price: 12 }, 'INVALID_PRICE'],
    [{ title: 'ok', style: { textColor: 'red' } }, 'INVALID_COLOR'],
    [{ title: 'ok', style: { bgColor1: '#12345' } }, 'INVALID_COLOR'],
    [{ title: 'ok', style: { fontFamily: 'comic-sans' } }, 'INVALID_FONT'],
    [{ title: 'ok', style: { borderRadius: '99px' } }, 'INVALID_BORDER'],
    [{ title: 'ok', style: { bgType: 'video' } }, 'INVALID_BG_TYPE'],
    [{ title: 'ok', style: { bgOverlay: 91 } }, 'INVALID_OVERLAY'],
    [{ title: 'ok', style: { bgOverlay: -1 } }, 'INVALID_OVERLAY'],
    [{ title: 'ok', customQrUrl: 'javascript:alert(1)' }, 'INVALID_QR_URL'],
    [{ title: 'ok', isPublished: 'si' }, 'INVALID_PUBLISHED'],
  ])('T1.3 — %j → 400 %s', (body, code) => {
    expect(codeOf(body)).toBe(code);
  });

  it('T1.3 — valori validi ai limiti vengono accettati', () => {
    const out = validateCardInput({
      title: 'x'.repeat(200),
      style: { bgOverlay: 90, bgType: 'image', fontFamily: 'roboto-mono', borderRadius: 'capsule', textColor: '#ABCDEF' },
    });
    expect(out.style.textColor).toBe('#abcdef');
    expect(out.style.bgOverlay).toBe(90);
  });

  it('T1.9 — gli errori rispettano il formato { error: { code, message } }', async () => {
    const app = express();
    app.use(express.json());
    app.post('/http', () => {
      throw new HttpError(400, 'X_CODE', 'messaggio');
    });
    app.post('/boom', () => {
      throw new Error('segreto interno');
    });
    app.use('/api', notFoundApi);
    app.use(errorHandler);
    const a = await request(app).post('/http').expect(400);
    expect(a.body).toEqual({ error: { code: 'X_CODE', message: 'messaggio' } });
    const b = await request(app).post('/boom').expect(500);
    expect(b.body).toEqual({ error: { code: 'INTERNAL', message: 'Errore interno del server' } });
    const c = await request(app).get('/api/nulla').expect(404);
    expect(c.body.error).toMatchObject({ code: 'NOT_FOUND' });
    const d = await request(app).post('/http').set('content-type', 'application/json').send('{rotto').expect(400);
    expect(d.body.error.code).toBe('INVALID_JSON');
  });
});
