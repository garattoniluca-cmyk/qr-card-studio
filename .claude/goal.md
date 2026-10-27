# goal.md — Esecuzione autonoma: step 0–9 (ADR-001)

Contratto di fine lavoro per il /goal. Si legge a ogni ripresa del lavoro insieme a
.claude/loop.md, CLAUDE.md, docs/ROADMAP.md, docs/JOURNAL.md (voce più recente) e docs/BUGS.md.

## Condizione da incollare in /goal

    Porta QR Card Studio dallo Step 0 allo Step 9 compreso di docs/ROADMAP.md, seguendo
    .claude/goal.md e .claude/loop.md. Il goal è raggiunto solo quando nell'ultimo turno compare
    l'output completo di `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify.ps1`
    con la riga finale `VERIFY: PASS` (lint pulito, build verde, nessun test fallito o saltato,
    soglie di test per step0…step9 raggiunte, ogni test U/I/E degli step 0–9 con esito ✅ e la sua
    evidenza in docs/JOURNAL.md), `git status` è pulito, esiste un commit per ogni step 0–9, e
    docs/JOURNAL.md contiene una voce per step più il resoconto finale.
    Vincoli: scritture solo sul database infoqrshow e sui database di test con prefisso
    qrcard_test_ (nessun altro database del server si modifica); credenziali solo in
    docs/local DBs.txt e server/.env, mai in file tracciati, nei log o negli MD; nessun git push;
    vietato abbassare le soglie o cambiare la logica di scripts/verify.ps1, cancellare, saltare
    o indebolire test o criteri di accettazione, e dichiarare ✅ senza evidenza; gli step già
    chiusi non devono regredire; perimetro solo DESIGN.md § Perimetro v1.
    Se lo stesso errore si ripete 5 volte, documentalo in docs/BUGS.md e prosegui con il lavoro
    non dipendente. Fermati comunque dopo 24 ore di lavoro, scrivendo il resoconto finale in
    docs/JOURNAL.md.

## Autorizzazioni date dall'utente
- Esecuzione autonoma degli step 0–9 senza fermarsi a fine step (sospesa per questi step la
  pausa di revisione della regola 2 di CLAUDE.md). Stop dopo lo step 9.
- Database: MySQL 8.0.40 su localhost:3307, database `infoqrshow` (ADR-010). root solo per il
  setup (creazione del database e degli utenti), scrivendolo nel diario; poi qrcard_app per
  l'app e qrcard_test per i test. Credenziali in `docs/local DBs.txt`.
- Dipendenze npm con licenza permissiva, registrate in ARCHITECTURE.md § Dipendenze.
  Browser di Playwright installati nella cartella del progetto. Nessun altro software da
  installare sul PC.
- Git: commit locali, uno per step (`step N: <titolo>`), più eventuali commit intermedi.
  Nessun push.
- Decisioni aperte: le prende l'agente e le registra come ADR con stato
  «accettata — decisa dall'agente, da rivedere».

## Adattamenti già decisi (per non fermarsi)
- Immagini di prova: generate con sharp (`server/scripts/make-fixtures.js`) in
  server/test/fixtures/ (jpeg, png, webp, GIF animata, immagine da 5000 px, finto .jpg);
  quelle del seed sono in server/seed/.
- Accesso in LAN (T8.3): la richiesta si fa all'IP LAN della macchina dalla macchina stessa.
- Smartphone e stampa reale (T8.8, T9.M1, T9.M2): predisposti con procedura scritta,
  eseguiti dall'utente.

## Vincoli non negoziabili
1. Mai abbassare le soglie o cambiare la logica di conteggio di scripts/verify.ps1, né togliere
   test o righe da docs/ROADMAP.md. Mai `test.skip`, `.only`, test svuotati o indeboliti.
   Se un test della roadmap si rivela sbagliato o impossibile non lo si tocca: lo si spiega
   in BUGS.md e lo step resta FAIL finché l'utente non decide.
2. ✅ solo con evidenza (formato in docs/JOURNAL.md).
3. Ogni test di integrazione crea il proprio database `qrcard_test_<id>` e lo distrugge alla
   fine, anche se il test fallisce. Lo stesso vale per la propria cartella uploads temporanea.
4. Nessuna regressione: se uno step chiuso torna FAIL, si ripara prima di tutto il resto.
5. Restano valide tutte le regole di CLAUDE.md, tranne la pausa di revisione della regola 2.

## Lezioni (valgono come regole)
- Un componente provato solo con finte non è «fatto». Le verifiche E passano dall'app vera
  (server avviato, database di test, browser Playwright), entrando dal punto dell'interfaccia
  dove l'utente cerca la funzione, e l'esito si ricontrolla sul database o sul disco.
- Revisore indipendente a ogni step, prima del commit. Le sue osservazioni si correggono,
  non si discutono via. Va controllato anche che i test non promettano più di quanto dimostrano.
- Una sola corsa di verify/test alla volta: le corse parallele si corrompono a vicenda.
- Evidenze oneste: gli screenshot si catturano quando mostrano davvero ciò che dichiarano;
  i tempi si citano come intervalli.
- Grafica: un solo pulsante primario per schermata, testi semplici in italiano, token di
  DESIGN-SYSTEM.md. Ogni schermata nuova si guarda in screenshot prima del commit.
- Il launcher del pannello di anteprima imposta `PORT` per Vite: il backend in sviluppo usa
  sempre `PORT=8080` esplicito e Vite lo raggiunge con `API_PORT` (BUG-001).

## Convenzioni di test
- Il nome di ogni test inizia con il codice: `T<step>.<n> — descrizione`. Il file o il blocco
  `describe` porta il tag dello step (`@step4`); quelli di integrazione anche `@it`, gli e2e `@e2e`.
- U: Vitest (client e server). I: Vitest + supertest sul server reale con database di test.
  E: Playwright sull'app avviata. M: elencate in JOURNAL.md, non automatizzabili.
- scripts/verify.ps1 conta i test superati per tag dai report JSON (cartella `.reports/`) e
  confronta con le soglie.

## Test che richiedono una persona
Solo T8.8, T9.M1 e T9.M2. Per questi soli la riga del diario è
`| <ID> | ✅ | predisposto: procedura pronta, da eseguire con l'utente (<file>) |`.
Nessun altro test può usare questa formula.

## Definizione di «fatto» per step (soglie congelate in scripts/verify.ps1)
| Step | Contenuto | Test superati (di cui I / E) |
|---|---|---|
| 0 | Fondamenta, memoria di progetto, DB, verify | ≥ 7 (≥ 2 I, ≥ 1 E) |
| 1 | Schema e API delle schede | ≥ 25 (≥ 15 I) |
| 2 | Media | ≥ 18 (≥ 12 I) |
| 3 | Shell e dashboard | ≥ 14 (≥ 8 E) |
| 4 | Editor e ProductCard | ≥ 30 (≥ 10 E) |
| 5 | URL pubblico e QR | ≥ 20 (≥ 6 I, ≥ 3 E) |
| 6 | Vista pubblica e stampa | ≥ 10 (≥ 7 E) |
| 7 | Sicurezza | ≥ 20 (≥ 12 I) |
| 8 | LAN e produzione | ≥ 10 (≥ 3 I, ≥ 3 E) |
| 9 | Verifica finale | ≥ 8 (≥ 4 I, ≥ 2 E) |

## Resoconto finale (in testa a docs/JOURNAL.md)
Step completati e non; output finale di verify.ps1; decisioni prese dall'agente da rivedere;
difetti aperti; verifiche M da fare con l'utente (con procedura); comandi di avvio, URL locale,
URL LAN e PUBLIC_BASE_URL; cosa si può fare ora.
