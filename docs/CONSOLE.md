# CONSOLE — Comandi

Tutti i comandi si lanciano dalla cartella del progetto (`C:\InfoQRshow`). Su Windows gli script della cartella corrente si chiamano con `.\`. Credenziali in `docs/local DBs.txt`.

## Setup
| Comando | Cosa fa | Contesto |
|---|---|---|
| `npm install` | installa le dipendenze di root, client e server (workspaces) | setup |
| `npm run setup` | installa le dipendenze, verifica MySQL, crea database e utenti, esegue le migrazioni, crea `uploads/`, genera `server/.env` da `.env.example` chiedendo la password admin | primo avvio |
| `npx playwright install chromium` (con `PLAYWRIGHT_BROWSERS_PATH=0`) | scarica Chromium nella cartella del progetto per i test E | setup test |
| `npm run migrate` | applica le migrazioni pendenti al database `infoqrshow` | manutenzione |
| `npm run seed` | crea la scheda di esempio passando dalla pipeline di upload | dev |

## Sviluppo
| Comando | Cosa fa | Contesto |
|---|---|---|
| `npm run dev` | backend su 8080 (`node --watch`) + Vite su 5173 con hot reload; il QR usa `PUBLIC_PORT=5173` | dev, anche in LAN (`http://<IP>:5173/admin`) |
| `npm run lint` | ESLint + controllo Prettier | qualità |
| `npm run format` | riformatta con Prettier | qualità |

## Produzione / LAN
| Comando | Cosa fa | Contesto |
|---|---|---|
| `npm run build` | build del client in `client/dist` | LAN |
| `npm start` | un solo processo Express sulla porta 8080 (API, `/uploads`, `/p`, SPA); stampa URL locale, URL LAN e `PUBLIC_BASE_URL` | LAN |
| `.\avvia.cmd` | doppio clic: build + `npm start` | LAN, uso quotidiano |
| `powershell -ExecutionPolicy Bypass -File .\scripts\firewall-windows.ps1` | apre la porta 8080 sulla rete privata (da amministratore); `-WhatIf` mostra cosa farebbe | LAN, una volta |

## Test e verifica
| Comando | Cosa fa | Contesto |
|---|---|---|
| `npm run test:unit` | test U e I (Vitest) di server e client; ogni file di test crea e distrugge il proprio database `qrcard_test_*` | sviluppo |
| `npx vitest run --config server/vitest.config.js test/step5` | solo i test di uno step | sviluppo |
| `npm run test:e2e` | test E con Playwright sull'app avviata | sviluppo |
| `npm test` | U + I + E | sviluppo |
| `npm run check-docs` | controlla che la memoria di progetto esista con le intestazioni obbligatorie | qualità |
| `npm run verify` oppure `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify.ps1` | lint, test, build, e2e, controllo credenziali, `npm audit`, conteggio per step; ultima riga `VERIFY: PASS` o `VERIFY: FAIL` | fine step |

## Manutenzione
| Comando | Cosa fa | Contesto |
|---|---|---|
| `npm run media:cleanup -- --dry-run` | elenca i media orfani senza toccarli | manutenzione |
| `npm run media:cleanup` | rimuove gli orfani più vecchi di 60 minuti (file e record) | manutenzione |
| `npm run media:cleanup -- --min-age=0` | rimuove tutti gli orfani, anche quelli appena caricati | manutenzione |
| `node server\scripts\make-fixtures.js` | rigenera le immagini del seed e delle fixture di test | sviluppo |

## Backup
```powershell
# Database (chiede la password di qrcard_app)
C:\mysql\bin\mysqldump.exe -h 127.0.0.1 -P 3307 -u qrcard_app -p --single-transaction --routines infoqrshow > backup\infoqrshow-AAAAMMGG.sql
# Immagini caricate
Compress-Archive -Path .\server\uploads\* -DestinationPath .\backup\uploads-AAAAMMGG.zip
# Ripristino del database
Get-Content .\backup\infoqrshow-AAAAMMGG.sql | C:\mysql\bin\mysql.exe -h 127.0.0.1 -P 3307 -u qrcard_app -p infoqrshow
```
