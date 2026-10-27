// Costruzione dell'app Express: API, /uploads statico, SPA buildata con fallback.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { sessionMiddleware } from './auth.js';
import { errorHandler, notFoundApi } from './errors.js';
import { createApiRouter } from './routes.js';
import { getCardRowByPublicId, PUBLIC_ID_RE } from './cards.js';

/**
 * @param {{ pool: import('mysql2/promise').Pool, config: object, interfaces?: object }} deps
 */
export function createApp({ pool, config, interfaces }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });
  if (config.logRequests) {
    // Registro minimo: metodo, percorso e stato. Mai header, cookie o corpo.
    app.use((req, res, next) => {
      res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode}`));
      next();
    });
  }

  // /uploads: solo file statici, senza elenco cartelle né dotfile.
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      dotfiles: 'deny',
      index: false,
      redirect: false,
      fallthrough: true,
      maxAge: '30d',
      immutable: true,
    }),
    (req, res) => res.status(404).type('text/plain').send('Non trovato'),
  );

  app.use(express.json({ limit: '3mb' }));
  app.use(sessionMiddleware(config));
  const api = createApiRouter({ pool, config, interfaces });
  app.locals.apiRouter = api;
  app.use(api);
  app.use('/api', notFoundApi);

  // SPA buildata (produzione/LAN). In sviluppo la serve Vite.
  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.get('/', (req, res) => res.redirect('/admin'));
    app.get('/p/:publicId', async (req, res, next) => {
      try {
        const { publicId } = req.params;
        const row = PUBLIC_ID_RE.test(publicId) ? await getCardRowByPublicId(pool, publicId) : null;
        // La pagina 404 curata la disegna la SPA, ma lo stato HTTP resta corretto.
        res.status(row && row.is_published ? 200 : 404).sendFile(indexHtml);
      } catch (e) {
        next(e);
      }
    });
    app.get(/^\/(admin)(\/.*)?$/, (req, res) => res.sendFile(indexHtml));
    app.get('*', (req, res) => res.status(404).sendFile(indexHtml));
  } else {
    app.get('/', (req, res) =>
      res.type('text/plain').send('QR Card Studio: client non buildato. Usa "npm run dev" oppure "npm run build".'),
    );
  }

  app.use(errorHandler);
  return app;
}
