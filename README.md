# QR Card Studio

Gestionale web per creare schede prodotto con testo formattato e immagini; ogni scheda ha un QR Code che apre la sua pagina pubblica. Funziona in locale e in LAN, e passa a un dominio esterno senza modifiche al codice.

## Requisiti
- Windows 10/11 (oppure Linux/macOS con gli stessi comandi npm)
- Node.js 20 o superiore (sviluppato con Node 24 LTS)
- MySQL 8.0 raggiungibile (qui: `localhost:3307`)

## Setup
```powershell
npm install
npm run setup
```
`npm run setup` verifica MySQL, crea il database `infoqrshow` e gli utenti dedicati (`qrcard_app` per l'app, `qrcard_test` per i test), esegue le migrazioni, crea la cartella `server/uploads` e genera `server/.env` a partire da `server/.env.example`, chiedendo la password dell'amministratore. Le credenziali non vanno mai nel repository: restano in `server/.env` e in `docs/local DBs.txt`, entrambi ignorati da git.

Per una scheda di prova: `npm run seed`, oppure il pulsante «Carica esempio» nella dashboard vuota.

## Avvio in sviluppo
```powershell
npm run dev
```
- Gestionale: http://localhost:5173/admin
- Dalla LAN: `http://<IP del PC>:5173/admin` (l'IP compare nella console e in Impostazioni)

## Avvio in LAN (produzione locale)
```powershell
npm run build
npm start
```
Oppure doppio clic su `avvia.cmd`. Un solo processo serve tutto sulla porta **8080**. All'avvio la console mostra l'URL locale, gli URL LAN e il `PUBLIC_BASE_URL` in uso con la sua origine.

## Test da smartphone
1. Avvia in modalità LAN (`npm start`).
2. Telefono e PC devono essere sulla stessa rete Wi-Fi/LAN.
3. Apri il firewall (sezione seguente).
4. In **Impostazioni** controlla che l'URL effettivo sia `http://<IP LAN>:8080` e premi «Prova URL».
5. Apri una scheda, stampa o mostra il cartellino e inquadra il QR: si apre la vista pubblica.

## Firewall di Windows
Da PowerShell **come amministratore**:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\firewall-windows.ps1
```
La regola apre la porta 8080 solo sulla rete **privata**, e lo script si può eseguire più volte senza duplicarla. Se Windows considera la tua rete «Pubblica», cambiala in «Privata» da *Impostazioni → Rete e Internet → Proprietà*.

## Passaggio a dominio esterno
1. Pubblica l'app dietro un reverse proxy (es. nginx) con HTTPS, che inoltri tutto alla porta 8080.
2. Imposta l'URL pubblico in uno dei due modi:
   - pagina **Impostazioni** → «Imposta un URL fisso» (ha la precedenza), oppure
   - `PUBLIC_BASE_URL=https://schede.tuodominio.it` in `server/.env`.
3. In `server/.env` imposta `TRUST_PROXY=true`, così il cookie di sessione diventa `Secure` sulle richieste HTTPS.
4. Riavvia. Tutti i QR si rigenerano con il nuovo dominio, senza modificare le schede (quelli già stampati vanno ristampati).

Le immagini sono salvate con percorsi relativi (`/uploads/...`), quindi funzionano con qualsiasi dominio.

## Backup
- **Database:** `mysqldump -h 127.0.0.1 -P 3307 -u qrcard_app -p --single-transaction infoqrshow > backup.sql`
- **Immagini:** copia la cartella `server/uploads/`.

Servono entrambi per un ripristino completo. Altri comandi in `docs/CONSOLE.md`.

## Documentazione
`CLAUDE.md` è l'indice; i dettagli sono in `docs/` (architettura, design, decisioni, roadmap, diario).
