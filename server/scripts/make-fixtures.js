// Genera le immagini del seed e le fixture dei test (eseguito una volta; i file sono versionati).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SERVER_ROOT } from '../src/config.js';

const seedDir = path.join(SERVER_ROOT, 'seed');
const fxDir = path.join(SERVER_ROOT, 'test', 'fixtures');
await fs.mkdir(seedDir, { recursive: true });
await fs.mkdir(fxDir, { recursive: true });

const svg = (w, h, c1, c2, label) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.7}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.22}" fill="#ffffff" fill-opacity="0.18"/>
  <rect x="${w * 0.18}" y="${h * 0.45}" width="${w * 0.42}" height="${h * 0.32}" rx="${h * 0.06}" fill="#0f172a" fill-opacity="0.25"/>
  <text x="50%" y="92%" font-family="Arial" font-size="${Math.round(h / 16)}" fill="#ffffff" text-anchor="middle">${label}</text></svg>`);

await sharp(svg(1600, 1000, '#b45309', '#4f46e5', 'Poltrona Nordica'))
  .jpeg({ quality: 82 })
  .toFile(path.join(seedDir, 'poltrona.jpg'));
await sharp(svg(1200, 800, '#0f766e', '#a855f7', 'Dettaglio'))
  .jpeg({ quality: 82 })
  .toFile(path.join(seedDir, 'dettaglio.jpg'));

await sharp(svg(800, 600, '#ef4444', '#3b82f6', 'jpeg'))
  .jpeg()
  .toFile(path.join(fxDir, 'foto.jpg'));
await sharp(svg(640, 480, '#22c55e', '#0ea5e9', 'png'))
  .png()
  .toFile(path.join(fxDir, 'immagine.png'));
await sharp(svg(500, 500, '#f59e0b', '#ec4899', 'webp'))
  .webp()
  .toFile(path.join(fxDir, 'immagine.webp'));
await sharp(svg(5000, 2500, '#1e293b', '#6366f1', 'grande'))
  .jpeg({ quality: 60 })
  .toFile(path.join(fxDir, 'grande-5000.jpg'));

// GIF animata a 3 fotogrammi: tre riquadri impilati, letti come pagine.
const frames = await Promise.all(
  ['#ef4444', '#22c55e', '#3b82f6'].map((c) =>
    sharp({ create: { width: 120, height: 80, channels: 4, background: c } })
      .png()
      .toBuffer(),
  ),
);
const stacked = await sharp({ create: { width: 120, height: 240, channels: 4, background: '#000000' } })
  .composite(frames.map((input, i) => ({ input, top: i * 80, left: 0 })))
  .raw()
  .toBuffer();
await sharp(stacked, { raw: { width: 120, height: 240, channels: 4, pageHeight: 80 } })
  .gif({ delay: [200, 200, 200], loop: 0 })
  .toFile(path.join(fxDir, 'animata.gif'));

// Finto JPEG: eseguibile Windows (intestazione MZ) rinominato .jpg
const fake = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(2046, 0x90)]);
await fs.writeFile(path.join(fxDir, 'finto.jpg'), fake);
console.log('Immagini generate in server/seed e server/test/fixtures');
