# DECISIONS — Registro delle decisioni architetturali (ADR)

Gli ADR non si cancellano: una decisione superata si marca «sostituito da ADR-xxx».

## ADR-001 — Costruzione iniziale in autonomia
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** gli step 0–9 sono molti e ben specificati; fermarsi a ogni step rallenterebbe senza aggiungere controllo.
- **Decisione:** gli step 0–9 si eseguono in autonomia secondo `.claude/goal.md` e `.claude/loop.md`, con verifica e diario a ogni step; ci si ferma per la revisione dopo lo step 9.
- **Alternative scartate:** revisione dell'utente a ogni step (troppo lenta).
- **Conseguenze:** servono soglie di test congelate in `verify.ps1` ed evidenze verificabili.

## ADR-002 — Stack
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** gestionale web con editor ricco, upload e QR, da far girare in LAN e poi su dominio.
- **Decisione:** React 18 + Vite + Tailwind + React Router; Node LTS + Express; MySQL 8 con `mysql2/promise`.
- **Alternative scartate:** FastAPI (secondo linguaggio da mantenere); Next.js (SSR non necessario, deploy più pesante).
- **Conseguenze:** monorepo npm workspaces `client/`, `server/` e `shared/`.

## ADR-003 — Editor rich text TipTap
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** `document.execCommand` è deprecato e produce markup irregolare (es. `<font>`).
- **Decisione:** TipTap (ProseMirror) con StarterKit, TextStyle/Color, TextAlign, Image; Link e Underline sono inclusi in StarterKit v3.
- **Alternative scartate:** execCommand; Quill; Lexical.
- **Conseguenze:** markup prevedibile, quindi la whitelist del sanitizzatore è stretta e verificabile.

## ADR-004 — URL pubblico e QR
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** il QR deve funzionare oggi in LAN e domani su dominio, senza rigenerare nulla a mano.
- **Decisione:** priorità `settings.public_base_url` → `PUBLIC_BASE_URL` in `.env` → IP LAN automatico. Il QR si rigenera al volo lato server e il `public_id` è immutabile.
- **Alternative scartate:** QR salvati come file (diventano obsoleti al cambio di dominio).
- **Conseguenze:** cambiare l'URL pubblico aggiorna tutti i QR; quelli già stampati con il vecchio dominio vanno ristampati.

## ADR-005 — Media con percorsi relativi
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** gli URL assoluti nei contenuti si romperebbero al cambio di host.
- **Decisione:** si salvano solo percorsi `/uploads/AAAA/MM/<uuid>.webp`; immagini convertite in WebP con sharp (max 2000 px), GIF animate lasciate in GIF; file su disco e metadati in DB.
- **Alternative scartate:** BLOB in database; URL esterni come nel prototipo.
- **Conseguenze:** il backup comprende database e cartella `server/uploads`.

## ADR-006 — Un solo processo in produzione/LAN
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** in LAN serve una sola porta, semplice da aprire nel firewall.
- **Decisione:** Express serve API, `/uploads`, `/p/:id` e la SPA buildata sulla porta 8080.
- **Alternative scartate:** nginx davanti fin da subito (resta possibile in futuro con `TRUST_PROXY`).
- **Conseguenze:** fallback della SPA gestito da Express.

## ADR-007 — Accesso admin con password unica
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** c'è un solo gestore; la vista pubblica deve restare libera.
- **Decisione:** hash bcrypt in `.env` (`ADMIN_PASSWORD_HASH`); sessione con cookie `httpOnly`, `SameSite=Lax`, `Secure` quando arriva via HTTPS e `TRUST_PROXY` è attivo.
- **Alternative scartate:** gestione utenti multipli (fuori perimetro v1).
- **Conseguenze:** per cambiare la password si rigenera l'hash nel `.env`.

## ADR-008 — Utenti MySQL dedicati
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** sullo stesso server ci sono altri database (`scuola`, `ramasql_*`).
- **Decisione:** `qrcard_app` con permessi solo su `infoqrshow`; `qrcard_test` solo su `qrcard\_test\_%`; root usato soltanto dal setup. Credenziali in `docs/local DBs.txt`.
- **Alternative scartate:** usare root per l'app.
- **Conseguenze:** un errore dell'app non può toccare altri database.

## ADR-009 — Migrazioni SQL versionate senza ORM
- **Data:** 2026-10-27
- **Stato:** accettato
- **Contesto:** lo schema è piccolo e si vuole SQL leggibile.
- **Decisione:** `server/migrations/NNN_descrizione.sql` più la tabella `schema_migrations`; il comando è `npm run migrate`.
- **Alternative scartate:** Prisma, Knex, Sequelize.
- **Conseguenze:** le query sono scritte a mano, sempre parametrizzate.

## ADR-010 — Database `infoqrshow` al posto di `qr_card_studio`
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente su indicazione dell'utente, da rivedere
- **Contesto:** l'utente ha indicato il catalogo già esistente `infoqrshow`, vuoto.
- **Decisione:** si usa `infoqrshow`, portato a `utf8mb4` / `utf8mb4_unicode_ci`. Ovunque il prompt dice `qr_card_studio` vale `infoqrshow`.
- **Alternative scartate:** creare `qr_card_studio` accanto.
- **Conseguenze:** `DB_NAME=infoqrshow` in `server/.env`.

## ADR-011 — TipTap 3, Vitest 5 e React Router 7
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** con TipTap 2 `npm audit` segnalava GHSA-cp6q-959q-f8rh (`mergeAttributes` e `__proto__`); Vitest 3 e React Router 6 avevano avvisi moderate/critical.
- **Decisione:** TipTap 3.32, Vitest 5, react-router-dom 7 (compatibile con React 18). Risultato: `npm audit` pulito.
- **Alternative scartate:** restare sulle versioni del prompt accettando le vulnerabilità.
- **Conseguenze:** API di TipTap 3 (Link e Underline dentro StarterKit, `TextStyle`/`Color` da `@tiptap/extension-text-style`).

## ADR-012 — Rotta `/p` in sviluppo e in produzione
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** il prompt chiedeva di passare `/p` al backend tramite il proxy di Vite, ma la vista pubblica è un componente React (ProductCard unico).
- **Decisione:** in sviluppo `/p/:id` lo serve la SPA di Vite e il QR usa `PUBLIC_PORT=5173`; il proxy passa solo `/api` e `/uploads`. In produzione Express risponde a `/p/:id` con `index.html` e stato 200 se la scheda è pubblicata, 404 altrimenti.
- **Alternative scartate:** rendering lato server della scheda (duplicherebbe la resa).
- **Conseguenze:** in sviluppo il QR punta alla porta di Vite, in produzione alla 8080.

## ADR-013 — Quali GET richiedono il login
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** il gestionale non deve esporre bozze e impostazioni.
- **Decisione:** richiedono login `GET /api/cards`, `/api/cards/:id`, `/api/categories`, `/api/settings`. Restano libere `/api/public/*`, `/api/health`, `/api/config/public-base-url` e le immagini QR.
- **Alternative scartate:** tutte le GET libere.
- **Conseguenze:** le schede non pubblicate non si leggono senza login (il loro QR sì, ma contiene solo un URL).

## ADR-014 — Sessioni in MemoryStore
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** c'è un solo processo e un solo amministratore.
- **Decisione:** il MemoryStore di `express-session`.
- **Alternative scartate:** `express-mysql-session` (una dipendenza in più e una tabella in più).
- **Conseguenze:** dopo un riavvio si rifà il login. Vedi IDEA-001.

## ADR-015 — Font da Google Fonts via CDN
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** servono Inter, Playfair Display, Montserrat e Roboto Mono; i pacchetti `@fontsource` hanno font OFL, fuori dalle licenze ammesse per le dipendenze.
- **Decisione:** si caricano da `fonts.googleapis.com` in `client/index.html`.
- **Alternative scartate:** incorporare i font nel repository.
- **Conseguenze:** senza internet si usano i font di sistema. Vedi IDEA-002.

## ADR-016 — Età minima dei media orfani
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** le immagini caricate in un editor non ancora salvato non appartengono a nessuna scheda.
- **Decisione:** `media:cleanup` rimuove solo gli orfani più vecchi di 60 minuti (`--min-age=N` per cambiare la soglia).
- **Alternative scartate:** rimuovere subito ogni orfano.
- **Conseguenze:** i test usano `--min-age=0`.

## ADR-017 — Regola dei tentativi falliti
- **Data:** 2026-10-27
- **Stato:** accettata — decisa dall'agente, da rivedere
- **Contesto:** la sezione 10.1 dice «3 tentativi, poi fermati e chiedi»; `goal.md` dice «5 tentativi, poi BUGS e prosegui».
- **Decisione:** durante la costruzione autonoma (ADR-001) vale `goal.md`; fuori da quella fase vale la 10.1.
- **Alternative scartate:** fermarsi al terzo tentativo anche in autonomia.
- **Conseguenze:** i blocchi finiscono in `BUGS.md` invece di fermare il lavoro.
