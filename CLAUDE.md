# CLAUDE.md — Indice e regole di ingaggio

## Cos'è questo progetto
QR Card Studio: gestionale web (React + Node/Express + MySQL) per creare schede prodotto
con testo formattato e immagini caricate sul server; ogni scheda salvata ha un QR Code che
apre la sua pagina pubblica. Oggi in locale e in LAN, domani su dominio esterno senza
modifiche al codice (URL pubblico configurabile). Riferimento grafico: reference/esempio_scheda.html.

## Stack
React 18 + Vite 6 + Tailwind 3 + React Router 7 + TipTap 3 · Node 24 + Express 4 · MySQL 8.0.40 (database `infoqrshow`, porta 3307) con `mysql2/promise`.
Motivazioni in `docs/ANALYSIS.md`, decisioni in `docs/DECISIONS.md`. Credenziali in `docs/local DBs.txt`.

## Comandi essenziali
- `npm run dev` — backend (8080) + Vite (5173) con hot reload
- `npm run build` e `npm start` — produzione/LAN su porta unica 8080
- `npm run test:unit` — test U e I (Vitest, database `qrcard_test_*`)
- `npm run verify` — verifica completa, deve stampare `VERIFY: PASS`

Elenco completo in `docs/CONSOLE.md`.

## Mappa di docs/ — quando leggere quale
| File | Quando leggerlo |
|---|---|
| docs/JOURNAL.md | sempre, a inizio sessione — cosa è stato fatto, cosa manca |
| docs/BUGS.md | a inizio sessione — difetti aperti, idee emerse |
| docs/ROADMAP.md | prima di iniziare un task — step corrente, verifiche di accettazione |
| docs/DECISIONS.md | prima di ogni scelta architetturale, per non ridiscutere il già deciso |
| docs/ANALYSIS.md | motivazioni dello stack, rischi, decisioni aperte |
| docs/FEASIBILITY.md | fattibilità e limiti di ogni requisito |
| docs/DESIGN.md | cosa fa il prodotto, schermate, comportamento, fuori perimetro |
| docs/DESIGN-SYSTEM.md | prima di toccare l'interfaccia |
| docs/ARCHITECTURE.md | prima di scrivere codice: struttura, DB, API, flusso URL/QR |
| docs/GLOSSARY.md | termini di dominio |
| docs/CONSOLE.md | comandi di setup, build, test, verifica |

## Regole non negoziabili
1. **Inizio sessione.** Prima di scrivere codice leggere le ultime voci di `docs/JOURNAL.md`, `docs/BUGS.md`, lo step corrente di `docs/ROADMAP.md` e i documenti pertinenti al task.
2. **Uno step alla volta.** Uno step si chiude solo con tutte le verifiche superate e documentate con evidenza, cancello G1–G8 superato e `scripts/verify.ps1` che stampa `VERIFY: PASS`. Poi voce in `JOURNAL.md` e aggiornamento di «Stato attuale».
   - Eccezione in vigore: la costruzione iniziale (step 0–9) si esegue in autonomia (`ADR-001`), regolata da `.claude/goal.md` e `.claude/loop.md`.
   - Dopo lo step 9 ci si ferma per la revisione dell'utente.
3. **Due modalità di lavoro.**
   - *Live* (predefinita): ogni ritocco provato con un test mirato o con l'app avviata; niente verifica completa a ogni ritocco; un commit per gruppo di ritocchi, mai push; `JOURNAL` e `BUGS` aggiornati a fine sessione o su richiesta.
   - *Autonoma* (solo su richiesta esplicita): grandi step con `VERIFY: PASS`, diario e commit a fine step.
4. **URL relativi per i media.** In DB e nell'HTML si salvano solo percorsi `/uploads/...`, mai URL assoluti.
5. **QR sempre dall'URL pubblico corrente.** Il QR codifica `{PUBLIC_BASE_URL}/p/{public_id}` o l'URL personalizzato. Mai `window.location` né `blob:`. Il QR non si salva su disco né in DB. Il `public_id` non cambia mai.
6. **Un solo componente di resa.** `<ProductCard />` (`client/src/components/ProductCard.jsx`) disegna la scheda per anteprima, vista pubblica e stampa.
7. **Sicurezza.** HTML del contenuto sanitizzato lato server; query solo parametrizzate; scritture solo con login admin.
8. **Credenziali.** Mai negli MD, nel codice o in git: stanno solo in `docs/local DBs.txt` e `server/.env`.
9. **Test distruttivi** solo su database con prefisso `qrcard_test_`, mai su `infoqrshow` né su altri database del server (`scuola`, `ramasql_*`, MariaDB sulla 3306).
10. **Dipendenze.** Ogni nuova dipendenza va in `ARCHITECTURE.md` § Dipendenze con versione, licenza e motivo. Solo licenze permissive (MIT, Apache-2.0, BSD, ISC).
11. **Dove si registra cosa.** Task → `JOURNAL.md`; scelta architetturale → ADR in `DECISIONS.md`; difetto o idea → `BUGS.md`; termine → `GLOSSARY.md`; comando → `CONSOLE.md`.
12. **Perimetro.** Fa fede `DESIGN.md` § Perimetro v1. Il resto va in `BUGS.md` tra le idee «dopo» / «forse dopo».
13. **Lingua e stile.** Interfaccia, commenti e documentazione in italiano. Modifiche chirurgiche, senza effetti collaterali.

## Stato attuale
Aggiornato al 2026-10-27.
- Backend (API schede, media, QR, impostazioni, login) e frontend (dashboard, editor TipTap, impostazioni, vista pubblica, cartellino) implementati; commit `a0b64e1`.
- Step 5 (URL pubblico e QR): verificato a mano nel browser; 16 test U/I superati (`test-results/step-5/unit-it.txt`). Mancano T5.7 e T5.8 (E).
- In corso: test degli step 0–4 e 6–9, `scripts/verify.ps1`. Nessuno step è ancora chiuso con `VERIFY: PASS`.
