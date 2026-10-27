# BUGS — Difetti e idee

## Aperti

### BUG-002 — T7.4 round-trip: lo spazio dopo `color:` viene normalizzato
- **Stato:** aperto
- **Gravità:** bassa
- **Dove:** server/src/sanitize.js, server/test/step7.test.js (T7.4 round-trip)
- **Come riprodurlo:** `npx vitest run --config server/vitest.config.js test/step7`
- **Atteso / Osservato:** atteso `style="color: #e11d48"` identico; osservato `style="color:#e11d48"` (sanitize-html riscrive gli stili senza spazio). Resa visiva identica, nessun impatto di sicurezza.
- **Causa e correzione:** da decidere con l'utente: confronto normalizzato nel test oppure post-elaborazione degli stili. Il test non è stato modificato (regola: mai indebolire un test).


## Chiusi

### BUG-001 — Backend sulla porta di Vite per PORT impostato dal launcher
- **Stato:** chiuso (2026-10-27, commit a0b64e1)
- **Gravità:** alta
- **Dove:** `package.json` (script `dev`), `client/vite.config.js`
- **Come riprodurlo:** avviare `npm run dev` dal pannello di anteprima, che imposta `PORT=5173` nell'ambiente di tutti i processi.
- **Atteso / Osservato:** atteso backend su 8080 e Vite su 5173. Osservato: il backend legge `PORT=5173` e prova la stessa porta di Vite; il proxy di Vite (che usava `PORT`) puntava a se stesso e l'app restava su «Caricamento…».
- **Causa e correzione:** `PORT` era usata sia dal backend sia dalla configurazione del proxy di Vite. Ora lo script `dev` passa al server `PORT=8080` in modo esplicito (`cross-env PORT=8080 PUBLIC_PORT=5173`), e Vite ricava la porta del backend da `API_PORT` (predefinita 8080), mai da `PORT`.

## Idee (dopo / forse dopo)

### IDEA-001 — Sessioni persistenti in MySQL
- **Classe:** forse dopo
- **Motivazione:** oggi le sessioni stanno in memoria (ADR-014): a ogni riavvio del server bisogna rifare il login.

### IDEA-002 — Font incorporati nel progetto
- **Classe:** dopo
- **Motivazione:** i font arrivano da Google Fonts (ADR-015); senza internet la scheda ripiega sui font di sistema.

### IDEA-003 — Duplicazione di una scheda
- **Classe:** forse dopo
- **Motivazione:** sarebbe comoda per creare in fretta varianti di prodotto. Non rientra nel perimetro v1.
