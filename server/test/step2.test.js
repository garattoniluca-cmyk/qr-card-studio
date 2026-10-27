import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeStoredName, storeUpload } from '../src/media.js';
import { SERVER_ROOT } from '../src/config.js';
import { createTestEnv } from './helpers.js';

// Senza cache: su Windows sharp terrebbe aperti i file e impedirebbe le cancellazioni.
sharp.cache(false);
const FX = path.join(SERVER_ROOT, 'test', 'fixtures');
const run = promisify(execFile);

describe('@step2 @it Media', () => {
  let env;
  let agent;
  beforeAll(async () => {
    env = await createTestEnv({ env: { MAX_UPLOAD_MB: '1' } });
    agent = await env.login();
  });
  afterAll(async () => env?.cleanup());

  const upload = (name) => agent.post('/api/media').attach('file', path.join(FX, name));
  const diskPath = (rel) => path.join(env.uploadDir, rel.replace(/^\/uploads\//, ''));

  it.each([
    ['foto.jpg', 800, 600],
    ['immagine.png', 640, 480],
    ['immagine.webp', 500, 500],
  ])('T2.1 — %s diventa .webp in uploads/AAAA/MM/ con record e dimensioni corrette', async (name, w, h) => {
    const { media } = (await upload(name).expect(201)).body;
    const now = new Date();
    const ym = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(media.url).toMatch(new RegExp(`^/uploads/${ym}/[0-9a-f-]{36}\\.webp$`));
    const meta = await sharp(diskPath(media.url)).metadata();
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([w, h]);
    const [[row]] = await env.pool.query('SELECT * FROM media WHERE id = ?', [media.id]);
    expect(row).toMatchObject({ mime: 'image/webp', width: w, height: h, original_name: name, path_relative: media.url });
    expect(row.size_bytes).toBe((await fs.stat(diskPath(media.url))).size);
  });

  it('T2.2 — 5000 px ridotta a 2000 px sul lato maggiore, proporzioni mantenute', async () => {
    const { media } = (await upload('grande-5000.jpg').expect(201)).body;
    expect([media.width, media.height]).toEqual([2000, 1000]);
    const meta = await sharp(diskPath(media.url)).metadata();
    expect([meta.width, meta.height]).toEqual([2000, 1000]);
  });

  it('T2.3 — una GIF animata resta GIF animata', async () => {
    const { media } = (await upload('animata.gif').expect(201)).body;
    expect(media.url).toMatch(/\.gif$/);
    expect(media.mime).toBe('image/gif');
    const meta = await sharp(diskPath(media.url), { animated: true }).metadata();
    expect(meta.format).toBe('gif');
    expect(meta.pages).toBeGreaterThan(1);
    expect([media.width, media.height]).toEqual([120, 80]);
  });

  it('T2.4 — eseguibile rinominato .jpg → 415, nessun file né record', async () => {
    const [[{ n0 }]] = await env.pool.query('SELECT COUNT(*) AS n0 FROM media');
    const r = await upload('finto.jpg').expect(415);
    expect(r.body.error.code).toBe('UNSUPPORTED_MEDIA');
    const [[{ after }]] = await env.pool.query('SELECT COUNT(*) AS after FROM media');
    expect(after).toBe(n0);
  });

  it('T2.4 — file oltre il limite → 413', async () => {
    const big = Buffer.alloc(1024 * 1024 + 10, 1);
    const r = await agent.post('/api/media').attach('file', big, 'enorme.jpg').expect(413);
    expect(r.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('T2.5 — /uploads risponde 200 con Content-Type e Cache-Control', async () => {
    const { media } = (await upload('foto.jpg').expect(201)).body;
    const r = await request(env.app).get(media.url).expect(200);
    expect(r.headers['content-type']).toBe('image/webp');
    expect(r.headers['cache-control']).toMatch(/max-age=\d{5,}/);
  });

  it.each(['/uploads/../.env', '/uploads/..%2f.env', '/uploads/%2e%2e/%2e%2e/package.json', '/uploads/..%5c..%5cpackage.json', '/uploads/.secret'])(
    'T2.5 — path traversal %s → 404',
    async (p) => {
      await fs.writeFile(path.join(env.uploadDir, '..', '.env'), 'SEGRETO=1').catch(() => {});
      const r = await request(env.app).get(p);
      expect(r.status).toBe(404);
      expect(r.text).not.toContain('SEGRETO');
    },
  );

  it('T2.6 — path_relative inizia sempre con /uploads/ senza host né protocollo', async () => {
    await upload('immagine.png').expect(201);
    const [rows] = await env.pool.query('SELECT path_relative FROM media');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.path_relative.startsWith('/uploads/')).toBe(true);
      expect(r.path_relative).not.toMatch(/^[a-z]+:|\/\//i);
    }
  });

  it('T2.7 — eliminando una scheda si cancellano i suoi media (file e record)', async () => {
    const hero = (await upload('foto.jpg').expect(201)).body.media;
    const inline = (await upload('immagine.png').expect(201)).body.media;
    const bg = (await upload('immagine.webp').expect(201)).body.media;
    const { card } = (
      await agent
        .post('/api/cards')
        .send({ title: 'Con media', heroMediaId: hero.id, contentHtml: `<p>x</p><img src="${inline.url}">`, style: { bgType: 'image', bgMediaId: bg.id } })
        .expect(201)
    ).body;
    const r = await agent.delete(`/api/cards/${card.id}`).expect(200);
    expect(r.body.mediaDeleted).toBe(3);
    for (const m of [hero, inline, bg]) {
      await expect(fs.stat(diskPath(m.url))).rejects.toThrow();
      const [rows] = await env.pool.query('SELECT id FROM media WHERE id = ?', [m.id]);
      expect(rows).toEqual([]);
    }
  });

  it("T2.7 — un media usato anche da un'altra scheda resta", async () => {
    const shared = (await upload('foto.jpg').expect(201)).body.media;
    const a = (await agent.post('/api/cards').send({ title: 'A', heroMediaId: shared.id }).expect(201)).body.card;
    await agent
      .post('/api/cards')
      .send({ title: 'B', contentHtml: `<img src="${shared.url}">` })
      .expect(201);
    await agent.delete(`/api/cards/${a.id}`).expect(200);
    await fs.stat(diskPath(shared.url));
    const [rows] = await env.pool.query('SELECT id FROM media WHERE id = ?', [shared.id]);
    expect(rows).toHaveLength(1);
  });

  describe('media:cleanup', () => {
    const cli = (args) =>
      run(process.execPath, [path.join(SERVER_ROOT, 'scripts', 'media-cleanup.js'), ...args], {
        env: {
          ...process.env,
          DB_NAME: env.db.database,
          DB_USER: env.db.user,
          DB_PASSWORD: env.db.password,
          UPLOAD_DIR: env.uploadDir,
        },
      });
    let orphan;
    let used;
    beforeAll(async () => {
      orphan = (await upload('foto.jpg').expect(201)).body.media;
      used = (await upload('immagine.png').expect(201)).body.media;
      await agent.post('/api/cards').send({ title: 'Usa', heroMediaId: used.id }).expect(201);
    });

    it('T2.8 — --dry-run elenca gli orfani senza toccarli', async () => {
      const { stdout } = await cli(['--dry-run', '--min-age=0']);
      expect(stdout).toContain(orphan.url);
      expect(stdout).not.toContain(used.url);
      await fs.stat(diskPath(orphan.url));
      const [rows] = await env.pool.query('SELECT id FROM media WHERE id = ?', [orphan.id]);
      expect(rows).toHaveLength(1);
    });

    it('T2.8 — senza --dry-run rimuove gli orfani da disco e DB, lascia gli usati', async () => {
      const { stdout } = await cli(['--min-age=0']);
      expect(stdout).toMatch(/media orfani rimossi/);
      await expect(fs.stat(diskPath(orphan.url))).rejects.toThrow();
      const [gone] = await env.pool.query('SELECT id FROM media WHERE id = ?', [orphan.id]);
      expect(gone).toEqual([]);
      await fs.stat(diskPath(used.url));
      const [kept] = await env.pool.query('SELECT id FROM media WHERE id = ?', [used.id]);
      expect(kept).toHaveLength(1);
    });
  });
});

describe('@step2 Nomi file (unitari)', () => {
  it('T2.9 — il nome su disco è un uuid e non contiene il nome originale', async () => {
    const name = makeStoredName('webp');
    expect(name).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/);
    const calls = [];
    const fakePool = { execute: async (sql, p) => (calls.push(p), [{ insertId: 1 }]) };
    const tmp = await fs.mkdtemp(path.join((await import('node:os')).tmpdir(), 'qrcard-u-'));
    try {
      const buf = await fs.readFile(path.join(FX, 'foto.jpg'));
      const rec = await storeUpload(fakePool, tmp, { buffer: buf, originalname: 'segreto-cliente-rossi.jpg' });
      expect(rec.filename).not.toContain('segreto');
      expect(rec.path_relative).not.toContain('rossi');
      expect(rec.original_name).toBe('segreto-cliente-rossi.jpg');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('T2.9 — due caricamenti dello stesso file producono nomi diversi', () => {
    const a = new Set(Array.from({ length: 200 }, () => makeStoredName('webp')));
    expect(a.size).toBe(200);
  });
});
