# ROADMAP — Step, stato e verifiche di accettazione

## Regole di avanzamento
Ogni step è un'unità chiusa e controllabile. Non si passa al successivo finché lo step corrente non ha superato tutte le sue verifiche `T<step>.<n>` e il cancello di qualità G1–G8.

| Classe | Significato | Strumento |
|---|---|---|
| **U** | unitario | Vitest |
| **I** | integrazione con DB di test `qrcard_test_*` e server reale | Vitest + supertest |
| **E** | end-to-end sull'app avviata | Playwright |
| **M** | manuale dell'utente | elencata in testa a `JOURNAL.md`, non blocca l'esecuzione autonoma |

- Ogni verifica U, I ed E è un test automatico che resta nella suite e fa da regressione. Il nome del test contiene il suo codice (es. `T4.2 — immagine incollata viene caricata`).
- Se una verifica fallisce si corregge il codice e si ripete l'intera suite.
- Dopo 3 tentativi falliti sulla stessa verifica si apre un `BUG-xxx` bloccante e si chiede all'utente. Durante la costruzione autonoma vale invece la regola dei 5 tentativi di `goal.md` (ADR-017).
- Una verifica non va mai indebolita, saltata o marcata «skip».

## Cancello di qualità (alla fine di OGNI step)
| # | Controllo | Criterio di superamento |
|---|---|---|
| G1 | Lint e formato (ESLint + Prettier) | 0 errori, 0 warning nuovi |
| G2 | Suite completa: step corrente e regressione | 100% verde, nessun test in skip |
| G3 | `scripts/verify.ps1` | stampa `VERIFY: PASS` |
| G4 | Revisione indipendente da un sotto-agente che non ha scritto il codice | nessun difetto bloccante o alto aperto; medi e bassi in `BUGS.md` |
| G5 | Nessuna credenziale nei file tracciati; `npm audit` | 0 occorrenze; nessuna vulnerabilità high o critical |
| G6 | Evidenze in `test-results/step-N/` | file presenti |
| G7 | Documentazione aggiornata (ROADMAP, JOURNAL, ADR, BUG, GLOSSARY, CONSOLE, CLAUDE.md) | aggiornata |
| G8 | Commit `step N: <titolo>` (mai push) | eseguito |

---

## Step 0 — Fondamenta
**Obiettivo:** memoria di progetto, monorepo, `.gitignore`, ESLint/Prettier, MySQL (database e utenti), `GET /api/health`, `scripts/verify.ps1`.
**Stato:** in corso (struttura, DB e health fatti; test e verify da fare)
- **T0.1 U** — `scripts/check-docs` verifica che tutti i file della memoria esistano con le intestazioni obbligatorie.
- **T0.2 I** — connessione come `qrcard_app`; `SELECT VERSION()` restituisce 8.0.x.
- **T0.3 I** — `qrcard_app` non legge altri database: la lettura di `mysql.user` fallisce con errore di permesso.
- **T0.4 U** — `git check-ignore` conferma che `.env`, `docs/local DBs.txt` e `uploads/` sono ignorati; la password non compare in nessun file tracciato.
- **T0.5 E** — `npm run dev` avvia client e server; `GET /api/health` risponde 200 con `db: "ok"`.
- **T0.6 U** — con un test volutamente fallito `verify.ps1` stampa `VERIFY: FAIL` ed esce con codice ≠ 0; tolto il test, stampa `PASS`.
- **T0.7 U** — lint e Prettier senza errori.

## Step 1 — Schema e API delle schede
**Obiettivo:** migrazioni, CRUD di `cards` con validazione, `public_id`, ricerca e filtri, API pubblica.
**Stato:** in corso (codice fatto, test da fare)
- **T1.1 I** — `migrate` su database vuoto crea tutte le tabelle e quella di tracciamento; rieseguito non applica nulla.
- **T1.2 I** — CRUD completo; `updated_at` cambia alla modifica.
- **T1.3 U** — validazione: titolo obbligatorio, lunghezze massime, colori hex, `fontFamily` e `borderRadius` ammessi, `bgType` tra solid/gradient/image, `bgOverlay` tra 0 e 90; ogni violazione dà 400 con `error.code` specifico.
- **T1.4 I** — `public_id` generato in automatico; nessuna collisione su 1000 creazioni; un PUT che prova a cambiarlo viene rifiutato.
- **T1.5 I** — `q` cerca in titolo, sottotitolo, SKU e categoria; filtro `category` e ordinamento per `updated_at` decrescente funzionano.
- **T1.6 I** — il titolo `'; DROP TABLE cards; --` si salva come testo e le tabelle restano intatte.
- **T1.7 I** — `GET /api/public/cards/:publicId` restituisce solo le schede pubblicate; non pubblicata o inesistente → 404.
- **T1.8 I** — emoji, accenti e € si salvano e si rileggono identici.
- **T1.9 U** — tutti gli errori hanno il formato `{ error: { code, message } }`.

## Step 2 — Media
**Obiettivo:** upload, conversione, file statici, pulizia alla cancellazione, `media:cleanup`.
**Stato:** in corso (codice fatto, test da fare)
- **T2.1 I** — un upload jpeg/png/webp produce un `.webp` in `uploads/AAAA/MM/` e un record `media` con le dimensioni corrette.
- **T2.2 I** — un'immagine da 5000 px viene ridotta a 2000 px sul lato maggiore, con le proporzioni mantenute.
- **T2.3 I** — una GIF animata resta animata (più di un frame).
- **T2.4 I** — un eseguibile rinominato `.jpg` → 415; un file oltre il limite → 413.
- **T2.5 I** — `/uploads/...` risponde 200 con `Content-Type` e `Cache-Control` corretti; il path traversal (`/uploads/../.env` e varianti codificate) dà 404.
- **T2.6 I** — `path_relative` inizia sempre con `/uploads/`, senza host né protocollo.
- **T2.7 I** — eliminando una scheda si cancellano i suoi media (file e record); quelli usati anche da un'altra scheda restano.
- **T2.8 I** — `media:cleanup --dry-run` elenca gli orfani senza toccarli; senza `--dry-run` li rimuove e lascia quelli usati.
- **T2.9 U** — il nome del file su disco è un uuid e non contiene il nome originale.

## Step 3 — Shell del frontend e dashboard
**Obiettivo:** layout e token, dashboard con ricerca e filtro, stato vuoto, modale di eliminazione, toast.
**Stato:** in corso (codice fatto, test da fare)
- **T3.1 E** — con il seed la dashboard mostra titolo, prezzo, categoria, SKU e copertina.
- **T3.2 E** — la ricerca filtra mentre si scrive; il filtro per categoria mostra i conteggi e si combina con la ricerca.
- **T3.3 E** — senza schede compare lo stato vuoto con «Crea prima scheda» e «Carica esempio», entrambi funzionanti.
- **T3.4 E** — eliminazione: «Annulla» non elimina; «Sì, elimina» elimina, mostra il toast e la scheda sparisce dal database.
- **T3.5 U** — Button, Modal e Toast accessibili: ruoli ARIA, focus intrappolato, Esc chiude, focus restituito.
- **T3.6 E** — a 375 e 1440 px nessuno scroll orizzontale; screenshot salvati.
- **T3.7 U** — nessun colore esadecimale scritto direttamente nei componenti fuori dai token (grep).
- **T3.8 E** — con il server fermo la dashboard mostra un toast di errore, non una pagina bianca; nessuna eccezione non gestita in console.

## Step 4 — Editor e `<ProductCard />`
**Obiettivo:** TipTap con toolbar completa, upload inline, copertina e sfondo, tutti gli stili, anteprima live.
**Stato:** in corso (codice fatto, test da fare)
- **T4.1 U** — ogni comando della toolbar produce il markup atteso (TipTap headless, un caso per comando).
- **T4.2 E** — immagine inserita con il pulsante, con drag & drop e incollata: in tutti i casi parte l'upload e nel contenuto c'è `<img src="/uploads/...">`.
- **T4.3 E** — upload di copertina e sfondo con anteprima; «Rimuovi» li toglie.
- **T4.4 E** — ogni opzione di stile si riflette subito nell'anteprima (3 sfondi, overlay 0/40/90, 4 font, 4 bordi, colore testo e accento).
- **T4.5 E** — salva, ricarica, riapri: campi, `content_html` e `style_json` identici; screenshot prima/dopo entro la soglia di diff.
- **T4.6 U** — un solo componente disegna la scheda (`ProductCard`); un controllo statico verifica che nessun altro file duplichi la resa.
- **T4.7 E** — il salvataggio senza titolo è bloccato con un messaggio e il focus va sul titolo.
- **T4.8 E** — un upload rifiutato (file troppo grande) mostra un toast di errore e lascia l'editor intatto.
- **T4.9 E** — per una scheda non salvata il footer mostra «QR disponibile dopo il salvataggio».

## Step 5 — URL pubblico e QR
**Obiettivo:** risoluzione di `PUBLIC_BASE_URL`, endpoint QR, Impostazioni, download e cartellino.
**Stato:** in corso (T5.1–T5.6 ✅, mancano T5.7 e T5.8)
- **T5.1 U** — rilevamento IP con interfacce simulate (vEthernet, WSL, Docker, VirtualBox, 192.168.1.20): viene scelto 192.168.1.20; senza IP privati ripiego su localhost con avviso.
- **T5.2 U** — priorità settings → env → auto rispettata in tutte le combinazioni, con l'origine corretta.
- **T5.3 I** — `qr.png` e `qr.svg` decodificati con jsQR contengono esattamente l'URL canonico; `size` rispettato.
- **T5.4 I** — con `custom_qr_url` il QR codifica quell'URL.
- **T5.5 I** — cambiando `PUBLIC_BASE_URL` (env, poi settings) il QR cambia e `cards` resta invariata; nessun file né colonna QR.
- **T5.6 U** — validazione dell'URL in Impostazioni: solo http/https, slash finale normalizzato, valori non validi rifiutati.
- **T5.7 E** — Impostazioni mostrano URL effettivo, origine, IP selezionabili e «Prova URL» con esito.
- **T5.8 E** — download di PNG e SVG validi; «Copia link» copia l'URL corretto; il cartellino si apre.

## Step 6 — Vista pubblica e stampa
**Obiettivo:** `/p/:publicId`, pagina 404, CSS di stampa.
**Stato:** in corso (codice fatto, test da fare)
- **T6.1 E** — senza login `/p/:publicId` mostra la scheda senza controlli del gestionale.
- **T6.2 E** — id inesistente e scheda non pubblicata mostrano la 404 curata.
- **T6.3 E** — a 375 e 390 px nessuno scroll orizzontale.
- **T6.4 E** — gli screenshot dell'anteprima nell'editor e della vista pubblica coincidono entro la soglia di diff.
- **T6.5 E** — con la stampa emulata (PDF) c'è solo la scheda, senza `no-print`; il cartellino sta su una pagina.
- **T6.6 E** — il QR nel PDF, rasterizzato e decodificato, contiene l'URL corretto.
- **T6.7 E** — nessun errore in console; le immagini del corpo si caricano in modo lazy.

## Step 7 — Sicurezza
**Obiettivo:** login admin, protezione delle rotte, sanitizzazione.
**Stato:** in corso (codice fatto, test da fare)
- **T7.1 I** — enumerando le rotte di scrittura dal router Express, senza sessione ognuna risponde 401.
- **T7.2 E** — `/admin` e sottorotte senza login reindirizzano a `/admin/login`; dopo il login si torna alla pagina richiesta.
- **T7.3 I** — password errata → 401; corretta → cookie `httpOnly` e `SameSite=Lax`; dopo il logout la sessione non vale più.
- **T7.4 I** — rimossi `<script>`, `onerror`/`onclick`, `href="javascript:"`, `<img>` con `src` esterno, `style` con `url()`, `<iframe>`; il markup legittimo di T4.1 sopravvive (round-trip).
- **T7.5 U** — in `.env` la password admin c'è solo come hash; i log non contengono credenziali né cookie.
- **T7.6 I** — `npm audit` senza vulnerabilità high o critical.

## Step 8 — LAN e produzione
**Obiettivo:** porta unica e fallback della SPA, banner all'avvio, firewall, `avvia.cmd`, `TRUST_PROXY`, README.
**Stato:** da fare
- **T8.1 E** — dopo `build` e `start` rispondono `/admin`, `/p/:id`, `/api/health` e `/uploads/...`; il refresh su una rotta profonda dà 200.
- **T8.2 E** — il banner mostra l'URL locale, gli URL LAN e `PUBLIC_BASE_URL` con la sua origine.
- **T8.3 I** — una richiesta all'IP LAN della macchina (non a localhost) riceve 200.
- **T8.4 U** — `firewall-windows.ps1` supera il parse, supporta `-WhatIf` ed è idempotente.
- **T8.5 E** — `avvia.cmd` esegue la build e avvia l'app; la pagina risponde.
- **T8.6 I** — con `TRUST_PROXY` e `X-Forwarded-Proto: https` il cookie di sessione è `Secure`.
- **T8.7 E** — copiando il progetto in una cartella pulita e seguendo il README, l'app si avvia.
- **T8.8 M** — scansione del QR da smartphone in LAN.

## Step 9 — Verifica finale end-to-end
**Obiettivo:** prove complete come test automatici.
**Stato:** da fare
- **T9.1 E** — `npm run setup` va a buon fine da zero, su un database appena creato.
- **T9.2 E** — con `npm start`: login, scheda con copertina, sfondo immagine, tutte le opzioni della toolbar e due immagini inline (pulsante e incolla); salvataggio e riapertura identici.
- **T9.3 I** — i file sono in `server/uploads/` e i percorsi nel DB sono relativi.
- **T9.4 I** — il QR decodificato contiene `http://<IP LAN>:<porta>/p/<public_id>` e quell'URL risponde 200.
- **T9.5 I** — con `PUBLIC_BASE_URL=https://esempio.it` il QR contiene il nuovo dominio, senza modifiche alle schede.
- **T9.6 I** — una scrittura senza login dà 401 e uno `<script>` nel contenuto viene rimosso.
- **T9.7 I** — eliminando la scheda si rimuovono i suoi file media.
- **T9.8** — revisione indipendente completa (G4 su tutto il progetto) e `VERIFY: PASS`.
- **T9.M1 M** — stampa reale del cartellino e scansione del QR stampato.
- **T9.M2 M** — prova d'uso dell'editor con una scheda vera.
