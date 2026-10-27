// Unico componente che disegna la scheda: lo usano anteprima live, vista pubblica e stampa.
import { useMemo } from 'react';
import { QrCode } from 'lucide-react';
import { BORDER_RADII, DEFAULT_STYLE, FONT_FAMILIES } from '@shared/card-options.js';

export function cardBackground(style, bgUrl) {
  if (style.bgType === 'image' && bgUrl) {
    const a = (Number(style.bgOverlay) || 0) / 100;
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${a})), url("${bgUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: style.bgColor1,
    };
  }
  if (style.bgType === 'gradient') return { background: `linear-gradient(135deg, ${style.bgColor1} 0%, ${style.bgColor2} 100%)` };
  return { background: style.bgColor1 };
}

/** Le immagini del corpo si caricano in modo lazy. */
function withLazyImages(html) {
  return (html || '').replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy"');
}

/**
 * @param {object} props
 * @param {object} props.card   { title, subtitle, price, sku, category, contentHtml, style }
 * @param {string|null} props.heroUrl  percorso relativo /uploads/... della copertina
 * @param {string|null} props.bgUrl    percorso relativo /uploads/... dello sfondo
 * @param {string|null} props.qrSrc    URL dell'immagine QR (endpoint server) oppure null se non salvata
 * @param {string|null} props.qrTarget URL codificato nel QR (mostrato in chiaro)
 */
export function ProductCard({ card, heroUrl = null, bgUrl = null, qrSrc = null, qrTarget = null }) {
  const style = { ...DEFAULT_STYLE, ...(card.style || {}) };
  const radius = BORDER_RADII[style.borderRadius]?.css ?? BORDER_RADII.soft.css;
  const font = FONT_FAMILIES[style.fontFamily]?.css ?? FONT_FAMILIES.inter.css;
  const html = useMemo(() => withLazyImages(card.contentHtml), [card.contentHtml]);
  const title = card.title || 'Titolo della scheda';

  return (
    <article data-testid="product-card" className="print-area overflow-hidden border border-slate-200/60 shadow-xl" style={{ borderRadius: radius }}>
      <div
        data-testid="product-card-body"
        className="flex flex-col justify-between p-6 sm:p-8"
        style={{ ...cardBackground(style, bgUrl), color: style.textColor, fontFamily: font }}
      >
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            {card.category ? (
              <span
                data-testid="card-category"
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: style.accentColor }}
              >
                {card.category}
              </span>
            ) : (
              <span />
            )}
            {card.sku ? <span className="rounded-lg bg-black/5 px-2.5 py-1 font-mono text-xs opacity-75">COD: {card.sku}</span> : null}
          </div>

          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
              {card.subtitle ? <p className="mt-1 text-sm opacity-80 sm:text-base">{card.subtitle}</p> : null}
            </div>
            {card.price ? (
              <div
                className="self-start whitespace-nowrap rounded-xl bg-white/90 px-3.5 py-1.5 text-2xl font-extrabold shadow-sm"
                style={{ color: style.accentColor }}
              >
                {card.price}
              </div>
            ) : null}
          </div>

          {heroUrl ? (
            <div className="my-5 overflow-hidden rounded-2xl bg-black/5 shadow-md">
              <img src={heroUrl} alt={title} className="max-h-80 w-full object-cover" />
            </div>
          ) : null}

          <hr className="my-5 border-current opacity-15" />

          <div
            data-testid="card-content"
            className="rich-content break-words text-sm leading-relaxed sm:text-base"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <footer className="print-avoid-break mt-8 border-t border-current/15 pt-5">
          <div
            className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-slate-800 shadow-md sm:flex-row"
            style={{ fontFamily: FONT_FAMILIES.inter.css }}
          >
            <div className="flex min-w-0 items-center gap-3.5 text-center sm:text-left">
              <div
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:flex"
                style={{ backgroundColor: style.accentColor }}
              >
                <QrCode aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: style.accentColor }}>
                  Scheda digitale prodotto
                </span>
                <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                <p className="mt-0.5 text-xs text-slate-500">Inquadra il QR Code per aprire questa scheda sul tuo smartphone</p>
                {qrTarget ? (
                  <p data-testid="qr-target" className="mt-1 max-w-[220px] truncate font-mono text-[10px] text-slate-400 sm:max-w-[260px]" title={qrTarget}>
                    {qrTarget}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-2 shadow-inner">
              {qrSrc ? (
                <img data-testid="card-qr" src={qrSrc} alt="QR Code della scheda" width="112" height="112" className="h-28 w-28" />
              ) : (
                <div
                  data-testid="qr-placeholder"
                  className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-center text-[10px] font-medium leading-snug text-slate-500"
                >
                  QR disponibile dopo il salvataggio
                </div>
              )}
              {card.sku ? <span className="mt-1 font-mono text-[9px] font-semibold text-slate-400">{card.sku}</span> : null}
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}
