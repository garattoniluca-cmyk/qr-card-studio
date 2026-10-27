// Scheda di esempio: le immagini in server/seed/ passano dalla stessa pipeline di upload.
import fs from 'node:fs/promises';
import path from 'node:path';
import { SERVER_ROOT } from './config.js';
import { storeUpload } from './media.js';
import { insertCard } from './cards.js';
import { sanitizeContent } from './sanitize.js';
import { validateStyle } from './validation.js';

export const SEED_DIR = path.join(SERVER_ROOT, 'seed');

async function uploadSeed(pool, uploadDir, name) {
  const buffer = await fs.readFile(path.join(SEED_DIR, name));
  return storeUpload(pool, uploadDir, { buffer, originalname: name });
}

export async function createDemoCard(pool, uploadDir) {
  const hero = await uploadSeed(pool, uploadDir, 'poltrona.jpg');
  const detail = await uploadSeed(pool, uploadDir, 'dettaglio.jpg');
  const html = sanitizeContent(`
    <h2>Comfort artigianale</h2>
    <p>Poltrona realizzata a mano con <strong>legno di rovere massello</strong> e rivestimento in <em>lana cotta</em>.
    Ogni pezzo è numerato e firmato dall'artigiano.</p>
    <ul><li><p>Struttura in rovere certificato FSC</p></li><li><p>Imbottitura in schiuma ad alta resilienza</p></li><li><p>Garanzia 10 anni</p></li></ul>
    <img src="${detail.path_relative}" alt="Dettaglio della cucitura">
    <blockquote><p>«Un oggetto che accompagna una vita intera.»</p></blockquote>
    <p style="text-align: center"><span style="color: #4f46e5">Disponibile in quattro colori.</span></p>`);
  const id = await insertCard(pool, {
    title: 'Poltrona Nordica',
    subtitle: 'Collezione Autunno 2026 — Edizione limitata',
    price: '€ 249,00',
    sku: 'ART-092',
    category: 'Arredamento',
    heroMediaId: hero.id,
    contentHtml: html,
    style: validateStyle({ bgType: 'gradient', bgColor1: '#ffffff', bgColor2: '#e0e7ff' }),
    customQrUrl: null,
    isPublished: true,
  });
  await pool.query('UPDATE media SET card_id = ? WHERE id IN (?)', [id, [hero.id, detail.id]]);
  return id;
}
