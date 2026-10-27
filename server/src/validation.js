// Validazione dell'input delle schede e delle impostazioni.
import { BG_TYPES, BORDER_RADII, DEFAULT_STYLE, FONT_FAMILIES, HEX_COLOR, LIMITS } from '../../shared/card-options.js';
import { HttpError } from './errors.js';

const fail = (code, message) => {
  throw new HttpError(400, code, message);
};

function optString(body, key, max, code) {
  const v = body[key];
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') fail(code, `Il campo ${key} deve essere testo`);
  const s = v.trim();
  if (s.length > max) fail(code, `Il campo ${key} supera ${max} caratteri`);
  return s;
}

function optMediaId(v, code) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) fail(code, 'Identificativo media non valido');
  return n;
}

/** Valida un URL http/https; restituisce l'URL normalizzato o lancia errore. */
export function normalizeHttpUrl(value, { code = 'INVALID_URL', trimSlash = false } = {}) {
  let u;
  try {
    u = new URL(String(value).trim());
  } catch {
    fail(code, 'URL non valido');
  }
  if (!['http:', 'https:'].includes(u.protocol)) fail(code, 'Sono ammessi solo URL http o https');
  if (u.username || u.password) fail(code, 'URL con credenziali non ammesso');
  let s = u.toString();
  if (trimSlash) s = s.replace(/\/+$/, '');
  return s;
}

export function validateStyle(input) {
  if (input === undefined || input === null) return { ...DEFAULT_STYLE };
  if (typeof input !== 'object' || Array.isArray(input)) fail('INVALID_STYLE', 'Stile non valido');
  const s = { ...DEFAULT_STYLE, ...input };
  if (!BG_TYPES.includes(s.bgType)) fail('INVALID_BG_TYPE', 'Tipo di sfondo non ammesso');
  for (const k of ['bgColor1', 'bgColor2', 'textColor', 'accentColor']) {
    if (typeof s[k] !== 'string' || !HEX_COLOR.test(s[k])) fail('INVALID_COLOR', `Colore ${k} non valido`);
    s[k] = s[k].toLowerCase();
  }
  const ov = Number(s.bgOverlay);
  if (!Number.isInteger(ov) || ov < 0 || ov > 90) fail('INVALID_OVERLAY', 'Il velo deve essere tra 0 e 90');
  s.bgOverlay = ov;
  if (!Object.hasOwn(FONT_FAMILIES, s.fontFamily)) fail('INVALID_FONT', 'Font non ammesso');
  if (!Object.hasOwn(BORDER_RADII, s.borderRadius)) fail('INVALID_BORDER', 'Stile dei bordi non ammesso');
  s.bgMediaId = optMediaId(s.bgMediaId, 'INVALID_STYLE');
  // Solo le chiavi note finiscono nel database.
  return Object.fromEntries(Object.keys(DEFAULT_STYLE).map((k) => [k, s[k]]));
}

/** Valida il corpo di POST/PUT /api/cards. Restituisce i campi puliti (content_html ancora da sanitizzare). */
export function validateCardInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_BODY', 'Corpo della richiesta non valido');
  if ('public_id' in body || 'publicId' in body) fail('PUBLIC_ID_IMMUTABLE', 'Il public_id non è modificabile');
  const title = optString(body, 'title', LIMITS.title, 'INVALID_TITLE');
  if (!title) fail('TITLE_REQUIRED', 'Il titolo è obbligatorio');
  const out = {
    title,
    subtitle: optString(body, 'subtitle', LIMITS.subtitle, 'INVALID_SUBTITLE'),
    price: optString(body, 'price', LIMITS.price, 'INVALID_PRICE'),
    sku: optString(body, 'sku', LIMITS.sku, 'INVALID_SKU'),
    category: optString(body, 'category', LIMITS.category, 'INVALID_CATEGORY'),
    heroMediaId: optMediaId(body.heroMediaId, 'INVALID_HERO'),
    style: validateStyle(body.style),
    isPublished: body.isPublished === undefined ? true : body.isPublished === true,
    customQrUrl: null,
    contentHtml: '',
  };
  if (body.isPublished !== undefined && typeof body.isPublished !== 'boolean') {
    fail('INVALID_PUBLISHED', 'isPublished deve essere vero o falso');
  }
  if (body.contentHtml !== undefined && body.contentHtml !== null) {
    if (typeof body.contentHtml !== 'string') fail('INVALID_CONTENT', 'Contenuto non valido');
    if (body.contentHtml.length > LIMITS.contentHtml) fail('INVALID_CONTENT', 'Contenuto troppo lungo');
    out.contentHtml = body.contentHtml;
  }
  const q = body.customQrUrl;
  if (q !== undefined && q !== null && String(q).trim() !== '') {
    if (typeof q !== 'string' || q.length > LIMITS.customQrUrl) fail('INVALID_QR_URL', 'URL QR non valido');
    out.customQrUrl = normalizeHttpUrl(q, { code: 'INVALID_QR_URL' });
  }
  return out;
}
