# loop.md — Il giro dell'esecuzione autonoma

Esecuzione autonoma di QR Card Studio — step 0–9 (ADR-001). Questo giro fa avanzare il lavoro
verso il goal, anche se il /goal si è fermato.

1. Leggi .claude/goal.md, CLAUDE.md, lo step corrente di docs/ROADMAP.md, la voce più recente di
   docs/JOURNAL.md e docs/BUGS.md. Controlla `git status` e `git log --oneline -5`.
2. Se ci sono modifiche non committate di un lavoro interrotto, riprendile: completale oppure
   riportale a uno stato coerente, mai perderle alla cieca.
3. Se sta già girando una verifica o un test, aspettane la fine: non lanciarne un'altra.
   Poi esegui `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify.ps1`.
   Se l'ultima riga è `VERIFY: PASS`, git status è pulito, esiste un commit per ogni step 0–9
   e il resoconto finale è in testa a docs/JOURNAL.md: scrivi una riga di conferma e termina.
4. Se uno step che era PASS adesso è FAIL, quello viene prima di tutto (regressione).
5. Altrimenti prendi il primo step non PASS, in ordine da 0 a 9, e lavora così, usando
   sotto-agenti per il lavoro parallelo e indipendente (mai due corse di test insieme):
   a. elenca i test dello step ancora senza ✅ nel diario e le soglie mancanti mostrate da verify;
   b. implementa il più piccolo passo utile, dentro il perimetro v1 di DESIGN.md e l'architettura
      di ARCHITECTURE.md, collegato all'app vera e raggiungibile dal punto dell'interfaccia dove
      l'utente lo cerca; la grafica segue DESIGN-SYSTEM.md e reference/esempio_scheda.html;
   c. verifica: scrivi i test che dimostrano il criterio, con i tag dello step, ed eseguili;
   d. controlla con un sotto-agente revisore, diverso da chi ha scritto il codice, che rilegga il
      cambiamento contro la riga di roadmap, DESIGN.md, DESIGN-SYSTEM.md e le regole di CLAUDE.md
      (URL relativi, QR dall'URL pubblico corrente, componente unico, sanitizzazione, query
      parametrizzate, credenziali, italiano) e cerchi difetti reali e test che promettono più di
      quanto dimostrano;
   e. correggi: se un test fallisce o il revisore trova un difetto, correggi il codice, mai il
      test per farlo passare; riesegui;
   f. concludi punto per punto: per ogni test superato aggiungi `| <ID> | ✅ | <evidenza> |`
      nella tabella dello step in docs/JOURNAL.md;
   g. quando il cancello G1–G8 è superato e verify dà PASS per lo step: aggiorna i documenti
      (JOURNAL, DECISIONS, ARCHITECTURE, CONSOLE, GLOSSARY, BUGS, stato in ROADMAP, «Stato attuale»
      di CLAUDE.md) e fai il commit `step N: <titolo>`.
6. Quando lo Step 9 è PASS e committato: verifica completa, scrivi il resoconto finale in testa a
   docs/JOURNAL.md e committa. Se la verifica rigenera file di evidenza, committali a parte così
   che git status resti pulito.
7. Stesso errore per 5 tentativi: voce in docs/BUGS.md con diagnosi, poi prosegui con ciò che non
   dipende da quel problema.
8. Mai: git push, scritture su database diversi da infoqrshow e qrcard_test_*, credenziali in
   file tracciati o nei log, modifiche a soglie o logica di verify.ps1, test saltati o svuotati,
   ✅ senza evidenza, funzioni fuori perimetro.
9. A fine giro, se il lavoro è in corso, pianifica il prossimo controllo tra 20–30 minuti.
