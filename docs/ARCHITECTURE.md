# ARCHITECTURE — Struttura, database, API, flussi

## Cartelle
```
client/                 SPA React (Vite)
  src/components/       ProductCard.jsx (unico componente di resa), AdminLayout, ui/ (Button, Modal, Toast), editor/ (RichTextEditor, MediaField, extensions.js)
  src/pages/            Dashboard, Editor, Settings, Login, PublicCard, QrTag, NotFound
  src/lib/              api.js (fetch + ApiError), auth.jsx (contesto e RequireAuth), clipboard.js
server/
  src/                  config, db, migrate, app (Express), routes (API), cards, media, publicUrl, qr, sanitize, validation, auth, errors, seed, index (avvio)
  migrations/           NNN_descrizione.sql
  scripts/              migrate, seed, media-cleanup, make-fixtures
  seed/                 immagini della scheda di esempio
  test/                 test Vitest (U e I) + fixtures/
  uploads/              media caricati (ignorato da git)
shared/card-options.js  opzioni di stile condivise (font, bordi, valori predefiniti, limiti)
scripts/                setup, check-docs, verify.ps1, firewall-windows.ps1
docs/                   memoria di progetto
reference/              prototipo HTML di riferimento
```

## Database (`infoqrshow`, utf8mb4_unicode_ci)
**`cards`**: `id` PK · `public_id` CHAR(10) univoco, immutabile · `title` (200), `subtitle` (300), `price` (60), `sku` (80), `category` (100) · `hero_media_id` FK → `media.id` (ON DELETE SET NULL) · `content_html` MEDIUMTEXT già sanitizzato · `style_json` JSON (`bgType`, `bgColor1`, `bgColor2`, `bgMediaId`, `bgOverlay`, `textColor`, `accentColor`, `fontFamily`, `borderRadius`) · `custom_qr_url` (2000, nullable) · `is_published` · `created_at`, `updated_at` (DATETIME(3)). Indici su `category` e `updated_at`.

**`media`**: `id` PK · `card_id` FK nullable → `cards.id` (ON DELETE SET NULL) · `filename` (uuid + estensione) · `original_name` · `mime` · `width`, `height`, `size_bytes` · `path_relative` univoco (`/uploads/AAAA/MM/<uuid>.webp|gif`) · `created_at`.

**`settings`**: `key` PK, `value`, `updated_at`. Contiene `public_base_url` (vuoto = automatico).

**`schema_migrations`**: `name`, `applied_at` (tracciamento delle migrazioni).

Utenti: `qrcard_app` solo su `infoqrshow`; `qrcard_test` solo su `qrcard_test_%`. Credenziali in `docs/local DBs.txt`.

## API
Errori sempre nel formato `{ "error": { "code", "message" } }`. 🔒 = richiede il login admin.

| Metodo e percorso | Accesso | Note |
|---|---|---|
| GET `/api/health` | libero | `{ status, db }`; 503 se il DB non risponde |
| POST `/api/auth/login` | libero | `{ password }`; rigenera la sessione |
| POST `/api/auth/logout` | libero | distrugge la sessione |
| GET `/api/auth/me` | libero | `{ authenticated }` |
| GET `/api/cards?q=&category=` | 🔒 | ordinamento `updated_at` decrescente; `{ cards, total }` |
| GET `/api/categories` | 🔒 | `[{ name, count }]` |
| GET `/api/cards/:id` | 🔒 | include `publicUrl` e `qrTarget` |
| POST `/api/cards` | 🔒 | 201; `public_id` generato |
| PUT `/api/cards/:id` | 🔒 | `public_id` non modificabile (400 `PUBLIC_ID_IMMUTABLE`) |
| DELETE `/api/cards/:id` | 🔒 | elimina anche i media non usati altrove |
| POST `/api/demo` | 🔒 | crea la scheda di esempio |
| GET `/api/public/cards/:publicId` | libero | solo se pubblicata, altrimenti 404 |
| GET `/api/cards/:id/qr.png` · `.svg` | libero | `?size=64..2048`, `?download=1` |
| GET `/api/public/cards/:publicId/qr.png` · `.svg` | libero | solo se pubblicata |
| POST `/api/media` | 🔒 | multipart, campo `file`; 415 se il formato non è ammesso, 413 se troppo grande |
| GET `/api/config/public-base-url` | libero | `{ url, source, warning, lanIps, port }` |
| GET `/api/settings` · PUT `/api/settings` | 🔒 | `{ publicBaseUrl }`; solo http/https, slash finale tolto |

Statici: `/uploads/...` con cache di 30 giorni e `immutable`; dotfile negati; percorsi non validi → 404.
In produzione: `/` → `/admin`; `/admin/*` → SPA; `/p/:publicId` → SPA con stato 200 (pubblicata) o 404; altri percorsi → SPA con 404.

## Flusso URL pubblico → QR
1. `resolvePublicBaseUrl` (`server/src/publicUrl.js`): `settings.public_base_url` → `PUBLIC_BASE_URL` (env) → `http://<IP LAN>:<PUBLIC_PORT|PORT>`. L'IP si ricava da `os.networkInterfaces()`, solo IPv4 privati, escludendo vEthernet, WSL, Docker, VirtualBox, VMware, Hyper-V, Bluetooth e loopback. Senza IP valido si ripiega su `localhost` con avviso.
2. Il target del QR è `custom_qr_url` se valorizzato, altrimenti `{base}/p/{public_id}`.
3. `qrcode` genera PNG o SVG al volo (correzione M, margine 4, `Cache-Control: no-store`): mai su disco né in DB.
4. In sviluppo `PUBLIC_PORT=5173`, quindi il QR punta a Vite, che serve `/p/:id` (ADR-012).

## Flusso media
Upload in memoria (multer) → sharp riconosce il formato reale (jpeg, png, webp, gif) → rotazione EXIF, ridimensionamento al massimo a 2000 px, WebP qualità 85 (le GIF restano GIF animate) → file `uploads/AAAA/MM/<uuid>.ext` → record `media`. Al salvataggio di una scheda i media che usa (copertina, sfondo, `<img>` nel contenuto) le vengono assegnati. All'eliminazione si cancellano quelli non usati da altre schede. `media:cleanup` rimuove gli orfani più vecchi di 60 minuti (ADR-016).

## Sicurezza
- `sanitize-html` in whitelist (`server/src/sanitize.js`): tag dell'editor; stili solo `color` e `text-align`; `<img>` solo con `src` che inizia con `/uploads/`; link solo http, https o mailto, con `target="_blank" rel="noopener noreferrer"`.
- Sessione `qrcard.sid`: `httpOnly`, `SameSite=Lax`, `Secure` automatico con `TRUST_PROXY`.
- Header `X-Content-Type-Options: nosniff` e `Referrer-Policy: same-origin`.

## Dipendenze
Solo licenze permissive. Versioni installate al 2026-10-27.

| Pacchetto | Versione | Licenza | Area | Motivo |
|---|---|---|---|---|
| express | 4.22.3 | MIT | server | server HTTP |
| mysql2 | 3.24.6 | MIT | server | driver MySQL con pool e query parametrizzate |
| multer | 2.5.0 | MIT | server | upload multipart con limite di dimensione |
| sharp | 0.35.5 | Apache-2.0 | server | riconoscimento formato, ridimensionamento, WebP/GIF; rasterizzazione nei test |
| qrcode | 1.5.4 | MIT | server | generazione QR PNG/SVG |
| sanitize-html | 2.18.1 | MIT | server | sanitizzazione del contenuto |
| dotenv | 18.0.9 | BSD-2-Clause | server | lettura di `server/.env` |
| bcrypt | 6.0.0 | MIT | server | hash della password admin |
| express-session | 1.19.0 | MIT | server | sessione admin |
| nanoid | 6.0.2 | MIT | server | `public_id` di 10 caratteri |
| react, react-dom | 18.3.1 | MIT | client | interfaccia |
| react-router-dom | 7.18.4 | MIT | client | rotte (ADR-011) |
| @tiptap/react, @tiptap/pm, @tiptap/starter-kit | 3.32.0 | MIT | client | editor rich text (ADR-003, ADR-011) |
| @tiptap/extension-text-style | 3.32.0 | MIT | client | colore del testo |
| @tiptap/extension-text-align | 3.32.0 | MIT | client | allineamenti |
| @tiptap/extension-image | 3.32.0 | MIT | client | immagini nel testo |
| lucide-react | 1.62.0 | ISC | client | icone |
| vite | 6.4.5 | MIT | dev | dev server e build |
| @vitejs/plugin-react | 4.7.0 | MIT | dev | JSX e fast refresh |
| tailwindcss | 3.4.19 | MIT | dev | CSS a utility e token |
| postcss | 8.5.32 | MIT | dev | pipeline CSS |
| autoprefixer | 10.6.2 | MIT | dev | prefissi CSS |
| concurrently | 10.0.6 | MIT | dev | `npm run dev` con client e server insieme |
| cross-env | 10.1.0 | MIT | dev | variabili d'ambiente negli script npm su Windows (BUG-001) |
| vitest | 5.0.5 | MIT | dev | test U e I |
| supertest | 7.3.1 | MIT | dev | richieste HTTP al server nei test I |
| jsdom | 29.1.1 | MIT | dev | DOM nei test del client |
| @testing-library/react | 16.3.3 | MIT | dev | test dei componenti |
| @testing-library/dom | 10.4.2 | MIT | dev | dipendenza di Testing Library |
| @testing-library/jest-dom | 7.0.1 | MIT | dev | asserzioni sul DOM |
| @testing-library/user-event | 14.6.8 | MIT | dev | interazioni simulate |
| @playwright/test | 1.64.1 | Apache-2.0 | dev | test E, screenshot e PDF |
| jsqr | 1.4.0 | Apache-2.0 | dev | decodifica dei QR nei test |
| pngjs | 7.0.0 | MIT | dev | lettura PNG nei test |
| pixelmatch | 8.0.0 | ISC | dev | confronti visivi |
| pdfjs-dist | 6.4.299 | Apache-2.0 | dev | rasterizzazione del PDF di stampa (T6.6) |
| eslint | 9.39.5 | MIT | dev | lint |
| @eslint/js | 9.39.5 | MIT | dev | regole base ESLint |
| eslint-plugin-react | 7.37.5 | MIT | dev | regole React |
| eslint-plugin-react-hooks | 5.2.0 | MIT | dev | regole degli hook |
| globals | 17.13.0 | MIT | dev | globali per ESLint |
| prettier | 3.9.10 | MIT | dev | formattazione |
