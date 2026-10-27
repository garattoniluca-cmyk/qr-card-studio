import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../lib/api.js';

/** Cartellino QR da stampare: titolo, prezzo, codice e QR grande, su una sola pagina. */
export function QrTagPage() {
  const { id } = useParams();
  const toast = useToast();
  const [card, setCard] = useState(null);

  useEffect(() => {
    api
      .get(`/api/cards/${id}`)
      .then((d) => setCard(d.card))
      .catch((e) => toast.error(e.message));
  }, [id, toast]);

  if (!card) return <p className="p-10 text-center text-sm text-slate-400">Caricamento…</p>;
  const accent = card.style.accentColor;

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link to={`/admin/cards/${card.id}`} className="inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Torna all'editor
        </Link>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>
          Stampa cartellino
        </Button>
      </div>
      <div data-testid="qr-tag" className="print-area print-avoid-break rounded-card border-2 border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        {card.category ? (
          <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ backgroundColor: accent }}>
            {card.category}
          </span>
        ) : null}
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900">{card.title}</h1>
        {card.price ? (
          <p className="mt-1 text-xl font-extrabold" style={{ color: accent }}>
            {card.price}
          </p>
        ) : null}
        <img src={`/api/cards/${card.id}/qr.svg?size=640&v=${encodeURIComponent(card.updatedAt)}`} alt="QR Code" className="mx-auto mt-4 h-64 w-64" data-testid="tag-qr" />
        <p className="mt-2 text-sm font-semibold text-slate-700">Inquadra per la scheda completa</p>
        {card.sku ? <p className="mt-1 font-mono text-xs text-slate-400">COD: {card.sku}</p> : null}
        <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{card.qrTarget}</p>
      </div>
    </div>
  );
}
