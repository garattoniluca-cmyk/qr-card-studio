// Gestione media: conversione con sharp, salvataggio su disco, metadati in DB, pulizia.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from './errors.js';
import { extractUploadPaths } from './sanitize.js';

export const MAX_SIDE = 2000;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

/** Nome file su disco: uuid, mai il nome originale. */
export function makeStoredName(ext) {
  return `${crypto.randomUUID()}.${ext}`;
}

/** Percorso relativo pubblico per anno/mese. */
export function relativeDirFor(date = new Date()) {
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return { y, m, rel: `/uploads/${y}/${m}` };
}

/** Riconosce il formato reale dal contenuto (non dall'estensione). */
async function detectFormat(buffer) {
  try {
    const meta = await sharp(buffer, { animated: true }).metadata();
    return ACCEPTED_FORMATS.has(meta.format) ? meta : null;
  } catch {
    return null;
  }
}

/**
 * Elabora e salva un file caricato. Le GIF restano GIF (animazione preservata), il resto diventa WebP.
 * Restituisce il record media inserito.
 */
export async function storeUpload(pool, uploadDir, file, { cardId = null } = {}) {
  if (!file?.buffer?.length) throw new HttpError(400, 'NO_FILE', 'Nessun file ricevuto');
  const meta = await detectFormat(file.buffer);
  if (!meta) throw new HttpError(415, 'UNSUPPORTED_MEDIA', 'Formato non supportato: sono ammessi JPEG, PNG, WebP e GIF');

  const isGif = meta.format === 'gif';
  const ext = isGif ? 'gif' : 'webp';
  const resize = { width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true };
  let pipeline = sharp(file.buffer, { animated: isGif }).rotate().resize(resize);
  pipeline = isGif ? pipeline.gif() : pipeline.webp({ quality: 85 });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const { y, m, rel } = relativeDirFor();
  const dir = path.join(uploadDir, y, m);
  await fs.mkdir(dir, { recursive: true });
  const filename = makeStoredName(ext);
  await fs.writeFile(path.join(dir, filename), data);

  const height = isGif && info.pageHeight ? info.pageHeight : info.height;
  const record = {
    card_id: cardId,
    filename,
    original_name: String(file.originalname || 'file').slice(0, 255),
    mime: isGif ? 'image/gif' : 'image/webp',
    width: info.width,
    height,
    size_bytes: data.length,
    path_relative: `${rel}/${filename}`,
  };
  const [res] = await pool.execute(
    'INSERT INTO media (card_id, filename, original_name, mime, width, height, size_bytes, path_relative) VALUES (?,?,?,?,?,?,?,?)',
    [record.card_id, record.filename, record.original_name, record.mime, record.width, record.height, record.size_bytes, record.path_relative],
  );
  return { id: res.insertId, ...record };
}

export function mediaPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    url: row.path_relative,
    mime: row.mime,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    originalName: row.original_name,
  };
}

/** Percorso assoluto su disco di un media, con controllo che resti dentro uploadDir. */
export function absolutePathFor(uploadDir, pathRelative) {
  const rel = pathRelative.replace(/^\/uploads\//, '');
  const abs = path.resolve(uploadDir, rel);
  if (!abs.startsWith(path.resolve(uploadDir) + path.sep)) throw new Error('percorso fuori da uploads');
  return abs;
}

/** Insieme degli id media usati da almeno una scheda (escludendo opzionalmente una scheda). */
export async function usedMediaIds(pool, { excludeCardId = null } = {}) {
  const [cards] = await pool.query(
    'SELECT id, hero_media_id, style_json, content_html FROM cards' + (excludeCardId ? ' WHERE id <> ?' : ''),
    excludeCardId ? [excludeCardId] : [],
  );
  const ids = new Set();
  const paths = new Set();
  for (const c of cards) {
    if (c.hero_media_id) ids.add(c.hero_media_id);
    const style = typeof c.style_json === 'string' ? JSON.parse(c.style_json) : c.style_json;
    if (style?.bgMediaId) ids.add(Number(style.bgMediaId));
    for (const p of extractUploadPaths(c.content_html)) paths.add(p);
  }
  if (paths.size) {
    const [rows] = await pool.query('SELECT id FROM media WHERE path_relative IN (?)', [[...paths]]);
    for (const r of rows) ids.add(r.id);
  }
  return ids;
}

/** Id dei media referenziati da una scheda (copertina, sfondo, immagini nel contenuto). */
export async function mediaIdsOfCard(pool, card) {
  const ids = new Set();
  if (card.hero_media_id) ids.add(card.hero_media_id);
  const style = typeof card.style_json === 'string' ? JSON.parse(card.style_json) : card.style_json;
  if (style?.bgMediaId) ids.add(Number(style.bgMediaId));
  const paths = extractUploadPaths(card.content_html);
  if (paths.length) {
    const [rows] = await pool.query('SELECT id FROM media WHERE path_relative IN (?)', [paths]);
    for (const r of rows) ids.add(r.id);
  }
  return ids;
}

/** Elimina record e file dei media indicati. */
export async function deleteMediaRows(pool, uploadDir, rows) {
  for (const r of rows) {
    await pool.execute('UPDATE cards SET hero_media_id = NULL WHERE hero_media_id = ?', [r.id]);
    await pool.execute('DELETE FROM media WHERE id = ?', [r.id]);
    try {
      await fs.unlink(absolutePathFor(uploadDir, r.path_relative));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
}

/**
 * Media orfani: non usati da nessuna scheda e più vecchi di `minAgeMinutes`
 * (per non toccare le immagini appena caricate in un editor non ancora salvato).
 */
export async function findOrphans(pool, { minAgeMinutes = 60 } = {}) {
  const used = await usedMediaIds(pool);
  const [rows] = await pool.query(
    'SELECT id, path_relative, original_name, size_bytes, created_at FROM media WHERE created_at <= (NOW(3) - INTERVAL ? MINUTE)',
    [minAgeMinutes],
  );
  return rows.filter((r) => !used.has(r.id));
}
