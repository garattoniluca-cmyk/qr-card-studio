// Rotte dell'API. Tutte registrate con il percorso completo su un unico router,
// così il test T7.1 può enumerare le rotte di scrittura.
import express from 'express';
import multer from 'multer';
import { ah, HttpError } from './errors.js';
import { checkPassword, requireAuth } from './auth.js';
import { pingDb } from './db.js';
import { normalizeHttpUrl, validateCardInput } from './validation.js';
import { sanitizeContent } from './sanitize.js';
import { deleteMediaRows, mediaIdsOfCard, mediaPublic, storeUpload, usedMediaIds } from './media.js';
import { getCardRow, getCardRowByPublicId, insertCard, listCardRows, listCategories, PUBLIC_ID_RE, serializeCards, updateCard } from './cards.js';
import { canonicalCardUrl, currentPublicBase, getSetting, setSetting } from './publicUrl.js';
import { clampSize, qrPng, qrSvg } from './qr.js';
import { createDemoCard } from './seed.js';

const parseId = (raw) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'NOT_FOUND', 'Scheda non trovata');
  return n;
};

export function createApiRouter({ pool, config, interfaces }) {
  const r = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadBytes, files: 1 } });

  const publicBase = () => currentPublicBase(pool, config, interfaces);

  async function withUrls(cards) {
    const { url } = await publicBase();
    return cards.map((c) => ({ ...c, publicUrl: canonicalCardUrl(url, c.publicId), qrTarget: c.customQrUrl || canonicalCardUrl(url, c.publicId) }));
  }

  async function loadCard(id) {
    const row = await getCardRow(pool, id);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Scheda non trovata');
    return row;
  }

  async function assertMediaExists(ids) {
    const list = ids.filter(Boolean);
    if (!list.length) return;
    const [rows] = await pool.query('SELECT id FROM media WHERE id IN (?)', [list]);
    if (rows.length !== new Set(list).size) throw new HttpError(400, 'MEDIA_NOT_FOUND', 'Immagine non trovata');
  }

  async function prepareCard(body) {
    const data = validateCardInput(body);
    data.contentHtml = sanitizeContent(data.contentHtml);
    await assertMediaExists([data.heroMediaId, data.style.bgMediaId]);
    return data;
  }

  /** Assegna alla scheda i media che usa e che non hanno ancora un proprietario. */
  async function claimMedia(cardId) {
    const ids = [...(await mediaIdsOfCard(pool, await getCardRow(pool, cardId)))];
    if (ids.length) await pool.query('UPDATE media SET card_id = ? WHERE card_id IS NULL AND id IN (?)', [cardId, ids]);
  }

  // --- Salute -----------------------------------------------------------------
  r.get(
    '/api/health',
    ah(async (req, res) => {
      let db = 'ok';
      try {
        await pingDb(pool);
      } catch {
        db = 'error';
      }
      res.status(db === 'ok' ? 200 : 503).json({ status: db === 'ok' ? 'ok' : 'degraded', db });
    }),
  );

  // --- Accesso ----------------------------------------------------------------
  r.post(
    '/api/auth/login',
    ah(async (req, res) => {
      const ok = await checkPassword(config, req.body?.password);
      if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Password non corretta');
      await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
      req.session.isAdmin = true;
      res.json({ authenticated: true });
    }),
  );
  r.post('/api/auth/logout', (req, res, next) => {
    if (!req.session) return res.json({ authenticated: false });
    req.session.destroy((e) => {
      if (e) return next(e);
      res.clearCookie('qrcard.sid');
      res.json({ authenticated: false });
    });
  });
  r.get('/api/auth/me', (req, res) => res.json({ authenticated: !!req.session?.isAdmin }));

  // --- Schede -----------------------------------------------------------------
  r.get(
    '/api/cards',
    requireAuth,
    ah(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';
      const category = typeof req.query.category === 'string' ? req.query.category.trim().slice(0, 100) : '';
      const rows = await listCardRows(pool, { q, category });
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM cards');
      res.json({ cards: await withUrls(await serializeCards(pool, rows)), total: Number(total) });
    }),
  );
  r.get(
    '/api/categories',
    requireAuth,
    ah(async (req, res) => res.json({ categories: await listCategories(pool) })),
  );
  r.get(
    '/api/cards/:id',
    requireAuth,
    ah(async (req, res) => {
      const row = await loadCard(parseId(req.params.id));
      const [card] = await withUrls(await serializeCards(pool, [row]));
      res.json({ card });
    }),
  );
  r.post(
    '/api/cards',
    requireAuth,
    ah(async (req, res) => {
      const data = await prepareCard(req.body);
      const id = await insertCard(pool, data);
      await claimMedia(id);
      const [card] = await withUrls(await serializeCards(pool, [await getCardRow(pool, id)]));
      res.status(201).json({ card });
    }),
  );
  r.put(
    '/api/cards/:id',
    requireAuth,
    ah(async (req, res) => {
      const id = parseId(req.params.id);
      await loadCard(id);
      const data = await prepareCard(req.body);
      await updateCard(pool, id, data);
      await claimMedia(id);
      const [card] = await withUrls(await serializeCards(pool, [await getCardRow(pool, id)]));
      res.json({ card });
    }),
  );
  r.delete(
    '/api/cards/:id',
    requireAuth,
    ah(async (req, res) => {
      const id = parseId(req.params.id);
      const row = await loadCard(id);
      const candidates = await mediaIdsOfCard(pool, row);
      const [owned] = await pool.execute('SELECT id FROM media WHERE card_id = ?', [id]);
      owned.forEach((m) => candidates.add(m.id));
      const usedElsewhere = await usedMediaIds(pool, { excludeCardId: id });
      const toDelete = [...candidates].filter((m) => !usedElsewhere.has(m));
      await pool.execute('DELETE FROM cards WHERE id = ?', [id]);
      if (toDelete.length) {
        const [rows] = await pool.query('SELECT id, path_relative FROM media WHERE id IN (?)', [toDelete]);
        await deleteMediaRows(pool, config.uploadDir, rows);
      }
      res.json({ deleted: true, mediaDeleted: toDelete.length });
    }),
  );
  r.post(
    '/api/demo',
    requireAuth,
    ah(async (req, res) => {
      const id = await createDemoCard(pool, config.uploadDir);
      const [card] = await withUrls(await serializeCards(pool, [await getCardRow(pool, id)]));
      res.status(201).json({ card });
    }),
  );

  // --- Vista pubblica ---------------------------------------------------------
  r.get(
    '/api/public/cards/:publicId',
    ah(async (req, res) => {
      const row = await loadPublished(req.params.publicId);
      const [card] = await withUrls(await serializeCards(pool, [row]));
      // La vista pubblica non espone l'id interno.
      delete card.id;
      res.json({ card });
    }),
  );

  // --- QR ---------------------------------------------------------------------
  async function loadPublished(publicId) {
    const row = PUBLIC_ID_RE.test(publicId) ? await getCardRowByPublicId(pool, publicId) : null;
    if (!row || !row.is_published) throw new HttpError(404, 'NOT_FOUND', 'Scheda non trovata');
    return row;
  }
  const qrHandler = (kind, byPublicId = false) =>
    ah(async (req, res) => {
      const row = byPublicId ? await loadPublished(req.params.publicId) : await loadCard(parseId(req.params.id));
      const { url } = await publicBase();
      const target = row.custom_qr_url || canonicalCardUrl(url, row.public_id);
      const size = clampSize(req.query.size);
      res.set('Cache-Control', 'no-store');
      if (req.query.download) {
        const safe = (row.sku || row.public_id).replace(/[^\w.-]+/g, '_');
        res.attachment(`qr-${safe}.${kind}`);
      }
      if (kind === 'png') res.type('png').send(await qrPng(target, size));
      else res.type('image/svg+xml').send(await qrSvg(target, size));
    });
  r.get('/api/cards/:id/qr.png', qrHandler('png'));
  r.get('/api/cards/:id/qr.svg', qrHandler('svg'));
  r.get('/api/public/cards/:publicId/qr.png', qrHandler('png', true));
  r.get('/api/public/cards/:publicId/qr.svg', qrHandler('svg', true));

  // --- Media ------------------------------------------------------------------
  r.post(
    '/api/media',
    requireAuth,
    upload.single('file'),
    ah(async (req, res) => {
      const media = await storeUpload(pool, config.uploadDir, req.file);
      res.status(201).json({ media: mediaPublic(media) });
    }),
  );

  // --- Configurazione e impostazioni -----------------------------------------
  r.get(
    '/api/config/public-base-url',
    ah(async (req, res) => {
      const info = await publicBase();
      res.json({ url: info.url, source: info.source, warning: info.warning || null, lanIps: info.lanIps, port: config.publicPort || config.port });
    }),
  );
  r.get(
    '/api/settings',
    requireAuth,
    ah(async (req, res) => res.json({ settings: { publicBaseUrl: (await getSetting(pool, 'public_base_url')) || '' } })),
  );
  r.put(
    '/api/settings',
    requireAuth,
    ah(async (req, res) => {
      const raw = req.body?.publicBaseUrl;
      if (raw !== undefined && raw !== null && typeof raw !== 'string') throw new HttpError(400, 'INVALID_URL', 'URL non valido');
      const value = raw && raw.trim() ? normalizeHttpUrl(raw, { trimSlash: true }) : '';
      await setSetting(pool, 'public_base_url', value);
      res.json({ settings: { publicBaseUrl: value } });
    }),
  );

  return r;
}

/** Elenco delle rotte registrate su un router: [{ method, path }]. */
export function listRoutes(router) {
  const out = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const m of Object.keys(layer.route.methods)) out.push({ method: m.toUpperCase(), path: layer.route.path });
  }
  return out;
}
