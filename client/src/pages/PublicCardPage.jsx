import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.jsx';
import { Button } from '../components/ui/Button.jsx';
import { api } from '../lib/api.js';
import { NotFoundPage } from './NotFoundPage.jsx';

/** Vista pubblica: mobile-first, sola lettura, nessun controllo del gestionale. */
export function PublicCardPage() {
  const { publicId } = useParams();
  const [state, setState] = useState({ status: 'loading', card: null });

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/public/cards/${encodeURIComponent(publicId)}`)
      .then((d) => alive && setState({ status: 'ok', card: d.card }))
      .catch((e) => alive && setState({ status: e.status === 404 ? 'missing' : 'error', card: null }));
    return () => {
      alive = false;
    };
  }, [publicId]);

  useEffect(() => {
    if (state.card) document.title = `${state.card.title} — QR Card Studio`;
  }, [state.card]);

  if (state.status === 'loading') return <div className="p-10 text-center text-sm text-slate-400">Caricamento…</div>;
  if (state.status === 'missing') return <NotFoundPage title="Scheda non disponibile" message="Questa scheda non esiste oppure non è pubblicata." />;
  if (state.status === 'error') return <NotFoundPage title="Servizio non raggiungibile" message="Riprova tra qualche istante." />;

  const { card } = state;
  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="no-print mb-4 flex justify-end">
        <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
          Stampa
        </Button>
      </div>
      <ProductCard
        card={card}
        heroUrl={card.hero?.url}
        bgUrl={card.bgMedia?.url}
        qrSrc={`/api/public/cards/${card.publicId}/qr.svg?size=320`}
        qrTarget={card.qrTarget}
      />
    </div>
  );
}
