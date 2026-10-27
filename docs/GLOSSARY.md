# GLOSSARY — Termini di dominio

| Termine | Significato | Dove compare nel codice |
|---|---|---|
| scheda | prodotto descritto con titolo, prezzo, codice, categoria, copertina, contenuto e stile | tabella `cards`, `server/src/cards.js`, `ProductCard.jsx` |
| `public_id` | codice di 10 caratteri, univoco e immutabile, usato negli URL pubblici | `cards.public_id`, `newPublicId()` in `server/src/cards.js` |
| URL canonico della scheda | `{PUBLIC_BASE_URL}/p/{public_id}` | `canonicalCardUrl()` in `server/src/publicUrl.js`; campo `publicUrl` dell'API |
| `PUBLIC_BASE_URL` | indirizzo di base con cui chi inquadra il QR raggiunge l'app | `server/.env`, `settings.public_base_url`, `resolvePublicBaseUrl()` |
| origine dell'URL | da dove arriva l'URL effettivo: `settings`, `env`, `auto-lan` (o `auto-localhost` di ripiego) | campo `source` di `/api/config/public-base-url`, pagina Impostazioni |
| URL QR personalizzato | URL alternativo che il QR codifica al posto di quello canonico | `cards.custom_qr_url`, campo «URL QR personalizzato» nell'editor |
| media | immagine caricata sul server (copertina, sfondo o nel testo) | tabella `media`, `server/src/media.js`, `/uploads/...` |
| contenuto (`content_html`) | testo formattato della scheda, già sanitizzato | `cards.content_html`, `RichTextEditor.jsx`, `sanitize.js` |
| stile della scheda (`style_json`) | sfondo, colori, font, bordi della scheda | `cards.style_json`, `shared/card-options.js` |
| anteprima live | resa della scheda nell'editor mentre si modifica | `EditorPage.jsx` (`data-testid="live-preview"`) con `ProductCard` |
| vista pubblica | pagina in sola lettura aperta dal QR | rotta `/p/:publicId`, `PublicCardPage.jsx` |
| cartellino QR | foglio stampabile con titolo, prezzo e QR grande | rotta `/admin/cards/:id/tag`, `QrTagPage.jsx` |
| media orfano | media non usato da nessuna scheda | `findOrphans()` in `server/src/media.js`, `npm run media:cleanup` |
| pubblicata / non pubblicata | se la vista pubblica è accessibile (altrimenti 404) | `cards.is_published`, checkbox «Pubblicata» nell'editor |
| velo (overlay) | oscuramento dell'immagine di sfondo, da 0 a 90% | `style.bgOverlay`, `cardBackground()` in `ProductCard.jsx` |
| database di test | database temporaneo `qrcard_test_<id>` creato e distrutto da ogni file di test | `server/test/helpers.js` |
