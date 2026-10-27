import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Download, ExternalLink, Image as ImageIcon, Layers, PaintBucket, PenTool, Printer, Save, Tag, WandSparkles } from 'lucide-react';
import { BORDER_RADII, DEFAULT_STYLE, FONT_FAMILIES } from '@shared/card-options.js';
import { ProductCard } from '../components/ProductCard.jsx';
import { RichTextEditor } from '../components/editor/RichTextEditor.jsx';
import { MediaField } from '../components/editor/MediaField.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../lib/api.js';
import { copyText } from '../lib/clipboard.js';

const EMPTY = { title: '', subtitle: '', price: '', sku: '', category: '', customQrUrl: '', isPublished: true };
const BG_OPTIONS = [
  { id: 'solid', label: 'Tinta unita', icon: PaintBucket },
  { id: 'gradient', label: 'Gradiente', icon: Layers },
  { id: 'image', label: 'Immagine', icon: ImageIcon },
];

function TextField({ id, label, value, onChange, inputRef, error, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className={`field ${error ? 'border-rose-400 ring-1 ring-rose-300' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ColorField({ id, label, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 p-1"
      />
    </div>
  );
}

export function EditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const titleRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [style, setStyle] = useState({ ...DEFAULT_STYLE });
  const [contentHtml, setContentHtml] = useState('');
  const [hero, setHero] = useState(null);
  const [bgMedia, setBgMedia] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  function applyCard(card) {
    setSaved(card);
    setForm({
      title: card.title,
      subtitle: card.subtitle,
      price: card.price,
      sku: card.sku,
      category: card.category,
      customQrUrl: card.customQrUrl || '',
      isPublished: card.isPublished,
    });
    setStyle({ ...DEFAULT_STYLE, ...card.style });
    setContentHtml(card.contentHtml || '');
    setHero(card.hero);
    setBgMedia(card.bgMedia);
  }

  useEffect(() => {
    if (isNew) {
      setSaved(null);
      setForm(EMPTY);
      setStyle({ ...DEFAULT_STYLE });
      setContentHtml('');
      setHero(null);
      setBgMedia(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .get(`/api/cards/${id}`)
      .then((d) => alive && applyCard(d.card))
      .catch((e) => {
        toast.error(e.status === 404 ? 'Scheda non trovata' : e.message);
        if (e.status === 404) navigate('/admin', { replace: true });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, isNew, navigate, toast]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'title' && v.trim()) setTitleError('');
  };
  const setS = (k) => (v) => setStyle((s) => ({ ...s, [k]: v }));
  const onUploadError = (e) => toast.error(e?.message || 'Caricamento non riuscito');

  async function save() {
    if (!form.title.trim()) {
      setTitleError('Il titolo è obbligatorio.');
      toast.error('Inserisci il titolo prima di salvare');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      customQrUrl: form.customQrUrl.trim() || null,
      heroMediaId: hero?.id ?? null,
      contentHtml,
      style: { ...style, bgMediaId: bgMedia?.id ?? null },
    };
    try {
      const { card } = isNew ? await api.post('/api/cards', body) : await api.put(`/api/cards/${id}`, body);
      applyCard(card);
      toast.success('Scheda salvata');
      if (isNew) navigate(`/admin/cards/${card.id}`, { replace: true });
    } catch (e) {
      if (e.code === 'TITLE_REQUIRED') {
        setTitleError(e.message);
        titleRef.current?.focus();
      }
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    const ok = await copyText(saved.publicUrl);
    if (ok) toast.success('Link copiato negli appunti');
    else toast.error('Copia non riuscita: seleziona il link a mano');
  }

  const draft = { ...form, contentHtml, style };
  const qrSrc = saved ? `/api/cards/${saved.id}/qr.svg?size=320&v=${encodeURIComponent(saved.updatedAt)}` : null;
  const qrTarget = saved ? saved.qrTarget : null;

  if (loading) return <p className="text-sm text-slate-400">Caricamento…</p>;

  return (
    <section>
      <div className="panel mb-6 flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            aria-label="Torna al catalogo"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{isNew ? 'Nuova scheda' : `Modifica: ${saved?.title || ''}`}</h2>
            <p className="text-xs text-slate-500">Modifica i contenuti a sinistra e osserva la scheda finale a destra.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            Annulla
          </Button>
          <Button variant="primary" size="lg" icon={Save} onClick={save} disabled={saving} data-testid="save-card">
            {saving ? 'Salvataggio…' : 'Salva'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <div className="panel space-y-4 p-6">
            <h3 className="panel-title">
              <Tag aria-hidden="true" className="h-4 w-4" /> 1. Dati principali
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  id="title"
                  label="Titolo prodotto *"
                  value={form.title}
                  onChange={set('title')}
                  inputRef={titleRef}
                  error={titleError}
                  placeholder="Es. Poltrona artigianale modello nordico"
                  maxLength={200}
                />
              </div>
              <TextField
                id="subtitle"
                label="Sottotitolo"
                value={form.subtitle}
                onChange={set('subtitle')}
                placeholder="Es. Collezione Autunno 2026"
                maxLength={300}
              />
              <div className="grid grid-cols-2 gap-2">
                <TextField id="price" label="Prezzo" value={form.price} onChange={set('price')} placeholder="€ 249,00" maxLength={60} />
                <TextField id="sku" label="Codice / SKU" value={form.sku} onChange={set('sku')} placeholder="ART-092" maxLength={80} />
              </div>
              <TextField
                id="category"
                label="Categoria"
                value={form.category}
                onChange={set('category')}
                placeholder="Arredamento, Elettronica…"
                maxLength={100}
              />
              <MediaField
                id="hero"
                label="Immagine di copertina"
                media={hero}
                onUpload={async (f) => setHero(await api.upload(f))}
                onRemove={() => setHero(null)}
                onError={onUploadError}
              />
            </div>
          </div>

          <div className="panel space-y-4 p-6">
            <h3 className="panel-title">
              <PenTool aria-hidden="true" className="h-4 w-4" /> 2. Contenuto e immagini
            </h3>
            <RichTextEditor value={contentHtml} onChange={setContentHtml} onUpload={(f) => api.upload(f)} onUploadError={onUploadError} />
          </div>

          <div className="panel space-y-5 p-6">
            <h3 className="panel-title">
              <WandSparkles aria-hidden="true" className="h-4 w-4" /> 3. Stile, sfondo e QR
            </h3>
            <div>
              <span className="field-label">Tipo di sfondo</span>
              <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Tipo di sfondo">
                {BG_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={style.bgType === o.id}
                    data-bg={o.id}
                    onClick={() => setS('bgType')(o.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${style.bgType === o.id ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-700' : 'border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50'}`}
                  >
                    <o.icon aria-hidden="true" className="h-4 w-4" /> {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-4">
              <ColorField
                id="bgColor1"
                label={style.bgType === 'gradient' ? 'Primo colore' : 'Colore sfondo'}
                value={style.bgColor1}
                onChange={setS('bgColor1')}
              />
              {style.bgType === 'gradient' ? <ColorField id="bgColor2" label="Secondo colore" value={style.bgColor2} onChange={setS('bgColor2')} /> : null}
              <ColorField id="textColor" label="Colore testo" value={style.textColor} onChange={setS('textColor')} />
              <ColorField id="accentColor" label="Colore accento" value={style.accentColor} onChange={setS('accentColor')} />
            </div>

            {style.bgType === 'image' ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <MediaField
                  id="bg"
                  label="Immagine di sfondo"
                  media={bgMedia}
                  onUpload={async (f) => setBgMedia(await api.upload(f))}
                  onRemove={() => setBgMedia(null)}
                  onError={onUploadError}
                />
                <div>
                  <label htmlFor="bgOverlay" className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>Velo scuro (leggibilità del testo)</span>
                    <span>{style.bgOverlay}%</span>
                  </label>
                  <input
                    id="bgOverlay"
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={style.bgOverlay}
                    onChange={(e) => setS('bgOverlay')(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-2 sm:grid-cols-3">
              <div>
                <label htmlFor="fontFamily" className="field-label">
                  Font
                </label>
                <select id="fontFamily" className="field bg-slate-50" value={style.fontFamily} onChange={(e) => setS('fontFamily')(e.target.value)}>
                  {Object.entries(FONT_FAMILIES).map(([k, f]) => (
                    <option key={k} value={k}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="borderRadius" className="field-label">
                  Bordi
                </label>
                <select id="borderRadius" className="field bg-slate-50" value={style.borderRadius} onChange={(e) => setS('borderRadius')(e.target.value)}>
                  {Object.entries(BORDER_RADII).map(([k, b]) => (
                    <option key={k} value={k}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                id="customQrUrl"
                label="URL QR personalizzato"
                value={form.customQrUrl}
                onChange={set('customQrUrl')}
                placeholder="Vuoto = pagina della scheda"
                type="url"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished')(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Pubblicata (visibile a chi inquadra il QR)
            </label>
          </div>
        </div>

        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:col-span-5">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Anteprima in tempo reale
            </span>
            {!saved ? <span className="text-xs text-slate-400">Il QR si genera al salvataggio</span> : null}
          </div>
          <div data-testid="live-preview">
            <ProductCard card={draft} heroUrl={hero?.url} bgUrl={bgMedia?.url} qrSrc={qrSrc} qrTarget={qrTarget} />
          </div>
          {saved ? (
            <div className="panel space-y-3 p-4" data-testid="qr-actions">
              <p className="text-xs text-slate-500">
                Il QR apre: <span className="break-all font-mono text-slate-700">{saved.qrTarget}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  href={`/api/cards/${saved.id}/qr.png?size=1024&download=1`}
                  download
                >
                  <Download aria-hidden="true" className="h-3.5 w-3.5" /> Scarica PNG
                </a>
                <a
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  href={`/api/cards/${saved.id}/qr.svg?size=1024&download=1`}
                  download
                >
                  <Download aria-hidden="true" className="h-3.5 w-3.5" /> Scarica SVG
                </a>
                <Button size="sm" variant="secondary" icon={Copy} onClick={copyLink} className="justify-center">
                  Copia link
                </Button>
                <Link
                  to={`/admin/cards/${saved.id}/tag`}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Printer aria-hidden="true" className="h-3.5 w-3.5" /> Stampa cartellino
                </Link>
              </div>
              <a
                href={`/p/${saved.publicId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                <ExternalLink aria-hidden="true" className="h-3 w-3" /> Apri vista pubblica
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
