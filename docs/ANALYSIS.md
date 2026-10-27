# ANALYSIS — Analisi iniziale

## Contesto
Il prototipo (`reference/esempio_scheda.html`) è una pagina singola con Firebase, immagini da URL esterni e un QR basato su `window.location` (URL `blob:` non apribili da altri dispositivi). Il prodotto lo trasforma in un'app multi-file con backend locale, upload nativi e QR stabili. Il prototipo vale come riferimento grafico, non architetturale.

## Ambiente (rilevato il 2026-10-27)
- Windows 11, Node 24.13.1 LTS, npm 11.8, git 2.47.
- MySQL 8.0.40 come servizio `MySQL80` (`C:\mysql`) sulla porta 3307; sulla 3306 c'è MariaDB, da non toccare.
- IP LAN 192.168.1.6 (Ethernet) e diversi adattatori 169.254.x da scartare.

## Stack scelto e alternative
| Area | Scelta | Alternative valutate |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind + React Router 7 | Next.js: SSR non necessario e deploy più pesante |
| Editor | TipTap 3 | execCommand (deprecato), Quill, Lexical |
| Backend | Node + Express 4 | FastAPI: secondo linguaggio; Express 5: rotte jolly cambiate, nessun vantaggio qui |
| DB | MySQL 8 con `mysql2/promise`, SQL a mano | ORM (Prisma/Knex): pesanti per tre tabelle |
| Immagini | sharp | Jimp (lento, senza WebP/GIF animate) |
| Test | Vitest, supertest, Playwright | Jest (più lento con ESM), Cypress |

Dettaglio delle decisioni in `docs/DECISIONS.md`.

## Rischi principali
| Rischio | Impatto | Mitigazione |
|---|---|---|
| Rilevamento dell'IP LAN con adattatori virtuali (vEthernet, WSL, Docker, VirtualBox) | QR che punta a un IP irraggiungibile | filtro per nome e per range privato, preferenza per 192.168.x, Impostazioni per scegliere l'IP o fissare l'URL |
| Firewall di Windows; rete Ethernet oggi con profilo «Pubblico» | smartphone non raggiunge la porta | `scripts/firewall-windows.ps1` (rete privata) + indicazione di cambiare il profilo di rete |
| Cambio di dominio | QR stampati obsoleti | QR generati al volo da `PUBLIC_BASE_URL`; quelli già stampati vanno ristampati (inevitabile) |
| XSS nel rich text | furto di sessione, defacement | sanitizzazione in whitelist lato server, immagini solo `/uploads/`, cookie `httpOnly` |
| Spazio occupato dagli upload | disco pieno | conversione WebP, massimo 2000 px, limite di 10 MB, pulizia alla cancellazione e `media:cleanup` |
| Altri database sullo stesso server | danni a dati non nostri | utenti MySQL con permessi limitati, test solo su `qrcard_test_*` |

## Decisioni aperte
- Sessioni persistenti (ADR-014, IDEA-001): oggi MemoryStore.
- Font offline (ADR-015, IDEA-002).
- Regola del firewall anche sul profilo «Pubblico», oppure cambio del profilo della rete Ethernet: decide l'utente (T8.8).
- Dominio esterno e HTTPS: da definire quando ci sarà il deploy.
