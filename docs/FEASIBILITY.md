# FEASIBILITY — Fattibilità dei requisiti

| Requisito | Fattibile | Limiti | Alternative |
|---|---|---|---|
| Backend locale MySQL al posto di Firebase | sì (fatto) | serve MySQL attivo sulla 3307 | MySQL portabile in `./mysql/` se il servizio manca |
| Upload nativi (copertina, sfondo, corpo) | sì (fatto) | 10 MB per file; formati jpeg, png, webp, gif | aumentare `MAX_UPLOAD_MB` |
| Conversione WebP e massimo 2000 px, GIF animate preservate | sì (fatto con sharp) | le GIF non vengono ricompresse in WebP animato | WebP animato in futuro |
| Inserimento immagini con pulsante, drag & drop e incolla | sì | l'incolla funziona per immagini negli appunti, non per URL di immagini esterne (voluto) | — |
| QR dall'URL pubblico, mai `window.location` | sì (fatto, verificato) | — | — |
| Rilevamento automatico dell'IP LAN | sì | euristica sui nomi degli adattatori; nomi insoliti di VPN possono sfuggire | scelta manuale in Impostazioni |
| Accesso da smartphone in LAN | sì | richiede firewall aperto e rete con profilo «Privato» (oggi Ethernet è «Pubblico») | regola firewall anche sul profilo Pubblico (decisione dell'utente) |
| Passaggio a dominio esterno senza modifiche al codice | sì | serve un reverse proxy con HTTPS e `TRUST_PROXY=true` | — |
| Stampa della sola scheda e del cartellino | sì | resa diversa tra browser; colori di sfondo con `print-color-adjust` | PDF da Playwright come riferimento |
| Login admin | sì (password unica) | un solo utente; sessione persa al riavvio (ADR-014) | utenti multipli fuori perimetro |
| Test E con QR decodificato dal PDF | sì | serve pdf.js nel browser di test | screenshot in stampa emulata |
| Test T8.4 firewall idempotente | parziale | l'agente non è amministratore: si prova con `-WhatIf` e verifica sintattica | esecuzione reale da parte dell'utente |
| Font selezionabili | sì | caricati da Google Fonts (servono internet) | font incorporati (IDEA-002) |

## Decisioni aperte
- Profilo della rete Ethernet o regola firewall sul profilo Pubblico (necessaria per T8.8).
- Persistenza delle sessioni (IDEA-001).
- Font offline (IDEA-002).
