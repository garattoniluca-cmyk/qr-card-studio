# DESIGN — Il prodotto

## Cosa fa
QR Card Studio permette a un gestore di creare **schede prodotto** (titolo, sottotitolo, prezzo, codice, categoria, copertina, testo formattato con immagini) personalizzandone la grafica. Ogni scheda salvata ha un **QR Code** che apre la sua **vista pubblica** sul telefono di chi lo inquadra. Il QR si stampa su un **cartellino** da esporre accanto all'oggetto fisico.

## Schermate
| Rotta | Schermata | Comportamento |
|---|---|---|
| `/` | — | reindirizza a `/admin` |
| `/admin/login` | Accesso | password unica; dopo il login si torna alla pagina richiesta (`?next=`) |
| `/admin` | Dashboard / catalogo | griglia di schede (copertina, titolo, prezzo, categoria, SKU, mini-QR); ricerca istantanea e filtro per categoria con conteggi; azioni Stampa, Modifica, Elimina (con modale di conferma). Senza schede: stato vuoto con «Crea prima scheda» e «Carica esempio» |
| `/admin/cards/new`, `/admin/cards/:id` | Editor | a sinistra dati principali, editor rich text (toolbar completa, immagini da pulsante, trascinamento e incolla), stile (sfondo tinta/gradiente/immagine con velo 0–90%, colori testo e accento, 4 font, 4 bordi, URL QR personalizzato, pubblicata sì/no); a destra anteprima live con `<ProductCard />` e, dopo il salvataggio, azioni QR: scarica PNG/SVG, copia link, stampa cartellino, apri vista pubblica |
| `/admin/cards/:id/tag` | Cartellino QR | categoria, titolo, prezzo, QR grande, codice; stampa su una pagina |
| `/admin/settings` | Impostazioni | URL pubblico effettivo con origine (impostazioni / env / automatico), «Prova URL», campo per un URL fisso, elenco degli IP LAN rilevati con «Usa questo» |
| `/p/:publicId` | Vista pubblica | mobile-first, sola lettura, pulsante Stampa; scheda inesistente o non pubblicata → 404 curata |
| altre | 404 | pagina «non trovata» curata |

## Comportamenti chiave
- Il QR codifica `{PUBLIC_BASE_URL}/p/{public_id}` oppure l'URL personalizzato; si genera sempre al volo, quindi cambiare dominio aggiorna tutti i QR.
- Prima del salvataggio il footer della scheda mostra «QR disponibile dopo il salvataggio».
- Le immagini si caricano sempre sul server; nei contenuti finiscono solo percorsi `/uploads/...`.
- Eliminando una scheda si eliminano le sue immagini non usate altrove.
- Messaggi di esito con toast; errori di rete con toast e mai pagina bianca.

## Perimetro v1
Dentro:
- gestione schede (crea, modifica, elimina, ricerca, filtro per categoria, pubblica/non pubblica);
- editor rich text con H1–H3, paragrafo, grassetto, corsivo, sottolineato, barrato, colore, allineamenti, elenchi, citazione, link, immagine, pulisci formattazione;
- copertina e sfondo caricati, stili della scheda;
- QR (PNG, SVG, copia link, cartellino), Impostazioni URL pubblico;
- vista pubblica stampabile, 404;
- login admin con password unica;
- scheda di esempio, pulizia dei media orfani;
- avvio in LAN su porta unica, script firewall, `avvia.cmd`.

Fuori perimetro v1 (eventuali richieste vanno in `BUGS.md` → Idee):
- più utenti, ruoli e permessi;
- multilingua delle schede;
- statistiche di scansione dei QR;
- import/export massivo, duplicazione di schede;
- immagini da URL esterno, video, allegati;
- pagamenti o carrello.
