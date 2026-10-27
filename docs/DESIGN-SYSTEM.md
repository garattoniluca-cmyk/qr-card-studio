# DESIGN-SYSTEM — Token e componenti

Ricavato da `reference/esempio_scheda.html` e realizzato in `client/tailwind.config.js`, `client/src/index.css` e `client/src/components/ui/*`. Nei componenti si usano le classi Tailwind della palette qui sotto, senza colori esadecimali scritti a mano. Unica eccezione: i colori scelti dall'utente per la scheda, che arrivano da `style_json`.

## Colori
| Ruolo | Token Tailwind | Uso |
|---|---|---|
| Sfondo app | `slate-100` | `body` |
| Superfici | `white`, bordo `slate-200` | pannelli, card, modali |
| Testo | `slate-800` (titoli), `slate-500/600` (secondario), `slate-400` (note) | |
| Primario | `indigo-600`, hover `indigo-700`, tenue `indigo-50` / testo `indigo-700` | pulsante primario, link, titoli di sezione, focus ring `indigo-500` |
| Marchio | gradiente `indigo-600 → violet-600` | logotipo «QR Card Studio» |
| Successo | `emerald-500/600/700`, fondo `emerald-50` | toast di conferma, pallino «anteprima live» |
| Errore / pericolo | `rose-600/700`, fondo `rose-50/100` | Elimina, errori di campo, toast di errore |
| Avviso | `amber-50` / `amber-700` | badge «Non pubblicata», avvisi |
| Velo modali | `slate-900/60` + `backdrop-blur-sm` | |

Valori predefiniti della scheda (`shared/card-options.js`): sfondo gradiente `#ffffff → #e0e7ff`, testo `#1e293b`, accento `#4f46e5`.

## Tipografia
- Interfaccia: **Inter** (300–800). Codici e URL: **Roboto Mono**.
- Font della scheda: Inter (Moderno Sans), Playfair Display (Elegante Serif), Montserrat (Geometrico), Roboto Mono (Tecnico Mono).
- Scala: titoli di pagina `text-lg font-bold`; titoli di sezione `text-sm font-bold uppercase tracking-wider text-indigo-600` (classe `.panel-title`); etichette `text-xs font-semibold text-slate-600` (`.field-label`); titolo della scheda `text-2xl/3xl font-extrabold`.
- Contenuto formattato: classe `.rich-content` (h1 2rem/800, h2 1.5rem/700, h3 1.25rem/600, p con interlinea 1.6, citazione con bordo sinistro 4px, immagini centrate e arrotondate).

## Raggi, ombre, spaziature
- Raggi: `rounded-control` 0.75rem (pulsanti, campi), `rounded-card` 1rem (pannelli, card); scheda prodotto 24 / 8 / 0 / 36 px secondo lo stile «bordi».
- Ombre: `shadow-sm` pannelli; `shadow-md shadow-indigo-100` pulsante primario; `shadow-xl` scheda in anteprima; `shadow-2xl` modali.
- Spaziature: pannelli `p-5`/`p-6`, griglie `gap-4`/`gap-6`, contenitore `max-w-7xl` con margini `px-4 sm:px-6 lg:px-8`.

## Componenti
- **Button** (`ui/Button.jsx`): varianti `primary` (uno solo per schermata), `success`, `secondary`, `soft`, `ghost`, `danger`, `danger-soft`, `warning`; taglie `sm`, `md`, `lg`, `icon`; focus visibile `ring-indigo-500`.
- **Input** (`.field`): `rounded-control border-slate-200`, focus `ring-2 ring-indigo-500`; errore con bordo rose e messaggio `role="alert"`.
- **Card della dashboard**: copertina h-36 con velo `from-slate-900/80`, prezzo in un badge bianco, riquadro QR, tre azioni (Stampa indigo tenue, Modifica slate, Elimina rose tenue).
- **Toolbar dell'editor**: barra `bg-slate-50 rounded-xl` con gruppi separati da divisori; pulsanti 32 px con `aria-pressed` per lo stato attivo; «Immagine» evidenziato in indigo tenue; «Pulisci» in rose a destra.
- **Modale** (`ui/Modal.jsx`): `role="dialog"`, `aria-modal`, focus intrappolato, Esc chiude, focus restituito, chiusura cliccando sul velo.
- **Toast** (`ui/Toast.jsx`): in basso a destra, `bg-slate-900` testo bianco, icona emerald (`role="status"`) o rose (`role="alert"`), circa 3 secondi.
- **Badge**: categoria della scheda (pillola nel colore di accento, testo bianco maiuscolo), «Non pubblicata» (amber), origine dell'URL (indigo tenue).
