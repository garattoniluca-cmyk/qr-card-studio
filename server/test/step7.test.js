import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listRoutes } from '../src/routes.js';
import { sanitizeContent } from '../src/sanitize.js';
import { PROJECT_ROOT, SERVER_ROOT } from '../src/config.js';
import { createTestEnv, TEST_PASSWORD } from './helpers.js';

const run = promisify(execFile);
// Rotte di scrittura che devono restare libere: l'accesso stesso.
const PUBLIC_WRITES = new Set(['POST /api/auth/login', 'POST /api/auth/logout']);

describe('@step7 @it Protezione delle scritture', () => {
  let env;
  beforeAll(async () => {
    env = await createTestEnv();
  });
  afterAll(async () => env?.cleanup());

  it('T7.1 — il router espone le rotte di scrittura attese', () => {
    const writes = listRoutes(env.app.locals.apiRouter)
      .filter((r) => r.method !== 'GET')
      .map((r) => `${r.method} ${r.path}`);
    expect(writes).toEqual(
      expect.arrayContaining(['POST /api/cards', 'PUT /api/cards/:id', 'DELETE /api/cards/:id', 'POST /api/media', 'PUT /api/settings', 'POST /api/demo']),
    );
  });

  it.each([
    ['POST', '/api/cards'],
    ['PUT', '/api/cards/:id'],
    ['DELETE', '/api/cards/:id'],
    ['POST', '/api/media'],
    ['PUT', '/api/settings'],
    ['POST', '/api/demo'],
  ])('T7.1 — %s %s senza sessione → 401', async (method, p) => {
    const url = p.replace(':id', '1');
    const r = await request(env.app)[method.toLowerCase()](url).send({ title: 'x' });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('UNAUTHORIZED');
  });

  it('T7.1 — enumerazione completa: OGNI rotta di scrittura del router risponde 401 senza sessione', async () => {
    const routes = listRoutes(env.app.locals.apiRouter).filter((r) => r.method !== 'GET' && !PUBLIC_WRITES.has(`${r.method} ${r.path}`));
    expect(routes.length).toBeGreaterThanOrEqual(6);
    for (const r of routes) {
      const res = await request(env.app)[r.method.toLowerCase()](r.path.replace(/:\w+/g, '1')).send({});
      expect(res.status, `${r.method} ${r.path}`).toBe(401);
    }
    const [[{ n }]] = await env.pool.query('SELECT COUNT(*) AS n FROM cards');
    expect(n).toBe(0);
  });

  it('T7.1 — le GET del gestionale richiedono login, quelle pubbliche no', async () => {
    for (const p of ['/api/cards', '/api/cards/1', '/api/categories', '/api/settings']) await request(env.app).get(p).expect(401);
    await request(env.app).get('/api/health').expect(200);
    await request(env.app).get('/api/config/public-base-url').expect(200);
    await request(env.app).get('/api/auth/me').expect(200, { authenticated: false });
  });

  it('T7.3 — password errata → 401', async () => {
    const r = await request(env.app).post('/api/auth/login').send({ password: 'sbagliata' }).expect(401);
    expect(r.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(r.headers['set-cookie']).toBeUndefined();
    await request(env.app).post('/api/auth/login').send({}).expect(401);
  });

  it('T7.3 — password corretta → cookie httpOnly e SameSite=Lax', async () => {
    const r = await request(env.app).post('/api/auth/login').send({ password: TEST_PASSWORD }).expect(200);
    const cookie = r.headers['set-cookie'][0];
    expect(cookie).toMatch(/^qrcard\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it('T7.3 — dopo il logout la sessione non è più valida', async () => {
    const agent = request.agent(env.app);
    await agent.post('/api/auth/login').send({ password: TEST_PASSWORD }).expect(200);
    const sid = (await agent.get('/api/auth/me')).request.cookies;
    await agent.get('/api/auth/me').expect(200, { authenticated: true });
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(200, { authenticated: false });
    await agent.post('/api/cards').send({ title: 'x' }).expect(401);
    // Il vecchio cookie riusato a mano non vale più
    if (sid) await request(env.app).get('/api/cards').set('Cookie', sid).expect(401);
  });
});

describe('@step7 @it Sanitizzazione del contenuto', () => {
  let env;
  let agent;
  beforeAll(async () => {
    env = await createTestEnv();
    agent = await env.login();
  });
  afterAll(async () => env?.cleanup());

  const save = async (html) => (await agent.post('/api/cards').send({ title: 'S', contentHtml: html }).expect(201)).body.card.contentHtml;

  it.each([
    ['<p>ok</p><script>alert(1)</script>', /<script|alert/],
    ['<img src="/uploads/2026/01/a.webp" onerror="alert(1)">', /onerror|alert/],
    ['<p onclick="alert(1)">clic</p>', /onclick/],
    ['<a href="javascript:alert(1)">x</a>', /javascript:/],
    ['<img src="https://evil.example/x.png">', /evil|<img/],
    ['<img src="//evil.example/x.png">', /evil|<img/],
    ['<p style="background:url(https://evil.example/x)">x</p>', /url\(|evil/],
    ['<p style="color: red; background-image: url(x)">x</p>', /url\(/],
    ['<iframe src="https://evil.example"></iframe>', /iframe/],
    ['<svg><script>alert(1)</script></svg>', /svg|script/],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', /data:|script/],
  ])('T7.4 — rimosso: %s', async (html, forbidden) => {
    const out = await save(html);
    expect(out).not.toMatch(forbidden);
  });

  it("T7.4 — round-trip: il markup legittimo dell'editor sopravvive intatto", async () => {
    const legit = [
      '<h1>Titolo</h1>',
      '<h2>Sotto</h2>',
      '<h3>Piccolo</h3>',
      '<p>Normale <strong>grassetto</strong> <em>corsivo</em> <u>sotto</u> <s>barrato</s></p>',
      '<p><span style="color: #e11d48">rosso</span> <span style="color: rgb(16, 185, 129)">verde</span></p>',
      '<p style="text-align: left">sx</p>',
      '<p style="text-align: center">centro</p>',
      '<h2 style="text-align: right">dx</h2>',
      '<ul><li><p>uno</p></li><li><p>due</p></li></ul>',
      '<ol><li><p>primo</p></li></ol>',
      '<blockquote><p>citazione</p></blockquote>',
      '<p><a target="_blank" rel="noopener noreferrer" href="https://esempio.it">link</a> <a target="_blank" rel="noopener noreferrer" href="mailto:info@esempio.it">mail</a></p>',
      '<img src="/uploads/2026/10/abc.webp" alt="foto">',
    ].join('');
    expect(await save(legit)).toBe(legit);
    expect(sanitizeContent(legit)).toBe(legit);
  });

  it('T7.4 — i link ricevono sempre rel="noopener noreferrer"', async () => {
    const out = await save('<p><a href="https://esempio.it" rel="opener">x</a></p>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).not.toContain('opener"');
  });
});

describe('@step7 Credenziali e log (unitari)', () => {
  it("T7.5 — in .env la password admin c'è solo come hash bcrypt", async () => {
    const env = await fs.readFile(path.join(SERVER_ROOT, '.env'), 'utf8');
    const lines = env.split(/\r?\n/).filter((l) => /^ADMIN_/.test(l));
    expect(lines.map((l) => l.split('=')[0])).toEqual(['ADMIN_PASSWORD_HASH']);
    expect(lines[0].split('=')[1]).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    const example = await fs.readFile(path.join(SERVER_ROOT, '.env.example'), 'utf8').catch(() => '');
    expect(example).not.toMatch(/\$2[aby]\$/);
  });

  it('T7.5 — i log delle richieste non contengono credenziali né cookie', async () => {
    const logs = [];
    const orig = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    const env = await createTestEnv({ env: { LOG_REQUESTS: 'true' } });
    try {
      const login = await request(env.app).post('/api/auth/login').send({ password: TEST_PASSWORD });
      const cookie = login.headers['set-cookie'][0].split(';')[0];
      await request(env.app).post('/api/auth/login').send({ password: 'tentativo-sbagliato' });
      await request(env.app).get('/api/cards').set('Cookie', cookie);
      await request(env.app).get('/api/cards?password=xyz');
      const all = logs.join('\n');
      expect(logs.length).toBeGreaterThanOrEqual(4);
      expect(all).not.toContain(TEST_PASSWORD);
      expect(all).not.toContain('tentativo-sbagliato');
      expect(all).not.toContain(cookie.split('=')[1]);
      expect(all).not.toContain('xyz');
    } finally {
      console.log = orig;
      await env.cleanup();
    }
  });
});

describe('@step7 @it Dipendenze', () => {
  it('T7.6 — npm audit (client e server) senza vulnerabilità high o critical', async () => {
    let out;
    try {
      out = (await run('npm', ['audit', '--json', '--workspaces', '--include-workspace-root'], { cwd: PROJECT_ROOT, shell: true, maxBuffer: 20e6 })).stdout;
    } catch (e) {
      out = e.stdout; // npm audit esce ≠ 0 anche per vulnerabilità basse
    }
    const v = JSON.parse(out.replace(/^FEFF/, '')).metadata.vulnerabilities;
    expect(v.high).toBe(0);
    expect(v.critical).toBe(0);
  }, 120000);
});
