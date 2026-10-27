// Accesso ai dati delle schede (query solo parametrizzate).
import { customAlphabet } from 'nanoid';
import { DEFAULT_STYLE } from '../../shared/card-options.js';
import { mediaPublic } from './media.js';

// Alfabeto senza caratteri ambigui; 10 caratteri.
export const newPublicId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 10);
export const PUBLIC_ID_RE = /^[23456789a-km-zA-HJ-NP-Z]{10}$/;

const parseStyle = (v) => ({ ...DEFAULT_STYLE, ...(typeof v === 'string' ? JSON.parse(v) : v || {}) });

async function mediaById(pool, ids) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return new Map();
  const [rows] = await pool.query('SELECT * FROM media WHERE id IN (?)', [list]);
  return new Map(rows.map((r) => [r.id, r]));
}

/** Converte le righe del DB nel formato dell'API, risolvendo copertina e sfondo. */
export async function serializeCards(pool, rows) {
  const styles = rows.map((r) => parseStyle(r.style_json));
  const media = await mediaById(pool, [...rows.map((r) => r.hero_media_id), ...styles.map((s) => s.bgMediaId)]);
  return rows.map((r, i) => ({
    id: r.id,
    publicId: r.public_id,
    title: r.title,
    subtitle: r.subtitle,
    price: r.price,
    sku: r.sku,
    category: r.category,
    heroMediaId: r.hero_media_id,
    hero: mediaPublic(media.get(r.hero_media_id)),
    contentHtml: r.content_html,
    style: styles[i],
    bgMedia: mediaPublic(media.get(styles[i].bgMediaId)),
    customQrUrl: r.custom_qr_url,
    isPublished: !!r.is_published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getCardRow(pool, id) {
  const [rows] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function getCardRowByPublicId(pool, publicId) {
  const [rows] = await pool.execute('SELECT * FROM cards WHERE public_id = ?', [publicId]);
  return rows[0] || null;
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listCardRows(pool, { q = '', category = '' } = {}) {
  const where = [];
  const params = [];
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push('(title LIKE ? OR subtitle LIKE ? OR sku LIKE ? OR category LIKE ?)');
    params.push(like, like, like, like);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  const sql = `SELECT * FROM cards ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC, id DESC`;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function listCategories(pool) {
  const [rows] = await pool.query(
    "SELECT category AS name, COUNT(*) AS count FROM cards WHERE category <> '' GROUP BY category ORDER BY category",
  );
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

export async function insertCard(pool, data) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const publicId = newPublicId();
    try {
      const [res] = await pool.execute(
        `INSERT INTO cards (public_id, title, subtitle, price, sku, category, hero_media_id, content_html, style_json, custom_qr_url, is_published)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          publicId,
          data.title,
          data.subtitle,
          data.price,
          data.sku,
          data.category,
          data.heroMediaId,
          data.contentHtml,
          JSON.stringify(data.style),
          data.customQrUrl,
          data.isPublished ? 1 : 0,
        ],
      );
      return res.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY' && String(e.message).includes('public_id')) continue;
      throw e;
    }
  }
  throw new Error('Impossibile generare un public_id univoco');
}

export async function updateCard(pool, id, data) {
  await pool.execute(
    `UPDATE cards SET title=?, subtitle=?, price=?, sku=?, category=?, hero_media_id=?, content_html=?, style_json=?, custom_qr_url=?, is_published=?,
     updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
    [
      data.title,
      data.subtitle,
      data.price,
      data.sku,
      data.category,
      data.heroMediaId,
      data.contentHtml,
      JSON.stringify(data.style),
      data.customQrUrl,
      data.isPublished ? 1 : 0,
      id,
    ],
  );
}
