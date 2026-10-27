// Avvio del server: un solo processo Express su 0.0.0.0.
import fs from 'node:fs/promises';
import { buildConfig, loadEnvFile } from './config.js';
import { createPool } from './db.js';
import { createApp } from './app.js';
import { currentPublicBase } from './publicUrl.js';

loadEnvFile();
const config = buildConfig();
await fs.mkdir(config.uploadDir, { recursive: true });
const pool = createPool(config.db);
const app = createApp({ pool, config });

const server = app.listen(config.port, config.host, async () => {
  const lines = ['', '  QR Card Studio — server avviato', `  Locale:   http://localhost:${config.port}/admin`];
  try {
    const info = await currentPublicBase(pool, config);
    for (const ip of info.lanIps) lines.push(`  LAN:      http://${ip.address}:${config.port}/admin   (${ip.interface})`);
    if (!info.lanIps.length) lines.push('  LAN:      nessun IP di rete locale rilevato');
    lines.push(`  PUBLIC_BASE_URL: ${info.url}   [origine: ${info.source}]`);
    if (info.warning) lines.push(`  Attenzione: ${info.warning}`);
  } catch (e) {
    lines.push(`  Database non raggiungibile: ${e.code || e.message}`);
  }
  console.log(lines.join('\n') + '\n');
});

const shutdown = () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
