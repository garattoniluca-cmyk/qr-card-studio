import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, PackageOpen, PenSquare, Plus, Printer, Search, Trash2, WandSparkles } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { cardBackground } from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function CardTile({ card, onDelete }) {
  return (
    <div data-testid="card-tile" className="group flex flex-col justify-between overflow-hidden rounded-card border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:shadow-lg">
      <div>
        <div className="relative flex h-36 items-end overflow-hidden p-4" style={cardBackground(card.style, card.bgMedia?.url)}>
          {card.hero ? (
            <img src={card.hero.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
          <div className="relative z-10 flex w-full items-end justify-between gap-3 text-white">
            <div className="min-w-0">
              {card.category ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{card.category}</span> : null}
              <h3 className="mt-1 line-clamp-1 text-base font-bold leading-snug">{card.title}</h3>
            </div>
            {card.price ? <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-extrabold text-slate-900 shadow">{card.price}</span> : null}
          </div>
        </div>
        <div className="p-4">
          <p className="line-clamp-2 min-h-[32px] text-xs text-slate-500">{card.subtitle || 'Nessun sottotitolo.'}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono text-slate-400">{card.sku ? `SKU: ${card.sku}` : 'Senza codice'}</span>
            {!card.isPublished ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Non pubblicata</span> : null}
          </div>
        </div>
      </div>
      <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5">
          <img src={`/api/cards/${card.id}/qr.svg?size=128&v=${encodeURIComponent(card.updatedAt)}`} alt="" width="56" height="56" className="h-14 w-14 shrink-0" loading="lazy" />
          <div className="min-w-0 text-xs">
            <span className="block font-bold text-slate-700">QR Code pronto</span>
            <span className="block truncate font-mono text-[10px] text-slate-400" title={card.qrTarget}>
              {card.qrTarget}
            </span>
            <a href={`/p/${card.publicId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline">
              <ExternalLink aria-hidden="true" className="h-3 w-3" /> Apri vista pubblica
            </a>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link to={`/admin/cards/${card.id}/tag`} className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
            <Printer aria-hidden="true" className="h-3.5 w-3.5" /> Stampa
          </Link>
          <Link to={`/admin/cards/${card.id}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
            <PenSquare aria-hidden="true" className="h-3.5 w-3.5" /> Modifica
          </Link>
          <button type="button" onClick={() => onDelete(card)} className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100">
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [cards, setCards] = useState(null);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const dq = useDebounced(q, 200);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dq.trim()) params.set('q', dq.trim());
      if (category) params.set('category', category);
      const [list, cats] = await Promise.all([api.get(`/api/cards?${params}`), api.get('/api/categories')]);
      setCards(list.cards);
      setCategories(cats.categories);
      setTotal(list.total);
    } catch (e) {
      setCards((c) => c || []);
      toast.error(e.message || 'Impossibile caricare le schede');
    }
  }, [dq, category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.del(`/api/cards/${toDelete.id}`);
      toast.success(`Scheda «${toDelete.title}» eliminata`);
      setToDelete(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createDemo() {
    setBusy(true);
    try {
      const { card } = await api.post('/api/demo');
      toast.success('Scheda di esempio creata');
      navigate(`/admin/cards/${card.id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const isEmpty = total === 0;

  return (
    <section className="space-y-6">
      <div className="panel flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Archivio schede prodotto</h2>
          <p className="text-sm text-slate-500">Gestisci le schede, personalizza la grafica e stampa i QR Code da esporre.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:min-w-[260px]">
            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Cerca schede" placeholder="Cerca per nome, codice o categoria…" className="field bg-slate-50 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Filtra per categoria" className="field bg-slate-50 sm:w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tutte le categorie ({total ?? 0})</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {cards === null ? <p className="text-sm text-slate-400">Caricamento…</p> : null}

      {isEmpty ? (
        <div data-testid="empty-state" className="mx-auto my-8 max-w-lg rounded-card border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <PackageOpen aria-hidden="true" className="h-8 w-8" />
          </div>
          <h3 className="mb-1 text-lg font-bold text-slate-800">Nessuna scheda prodotto</h3>
          <p className="mb-6 text-sm text-slate-500">Crea la prima scheda con testo formattato, immagini e QR Code automatico.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" icon={Plus} onClick={() => navigate('/admin/cards/new')}>
              Crea prima scheda
            </Button>
            <Button variant="secondary" size="lg" icon={WandSparkles} onClick={createDemo} disabled={busy}>
              Carica esempio
            </Button>
          </div>
        </div>
      ) : null}

      {cards && cards.length === 0 && !isEmpty ? <p className="rounded-card border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nessuna scheda corrisponde alla ricerca.</p> : null}

      {cards && cards.length > 0 ? (
        <div data-testid="cards-grid" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} onDelete={setToDelete} />
          ))}
        </div>
      ) : null}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminare questa scheda?"
        description="La scheda e le sue immagini verranno rimosse definitivamente. Il QR Code già stampato non aprirà più nulla."
        size="sm"
        center
        icon={
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </div>
        }
      >
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} data-autofocus>
            Annulla
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={busy}>
            Sì, elimina
          </Button>
        </div>
      </Modal>
    </section>
  );
}
