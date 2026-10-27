import { useCallback, useEffect, useState } from 'react';
import { Globe, Network, Save, Stethoscope } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../lib/api.js';

const SOURCE_LABEL = {
  settings: 'Impostazioni (questa pagina)',
  env: 'File .env (PUBLIC_BASE_URL)',
  'auto-lan': 'Automatico: IP della rete locale',
  'auto-localhost': 'Automatico: solo questo PC',
};

export function SettingsPage() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cfg, s] = await Promise.all([api.get('/api/config/public-base-url'), api.get('/api/settings')]);
      setInfo(cfg);
      setValue(s.settings.publicBaseUrl);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next = value) {
    setBusy(true);
    setError('');
    try {
      const { settings } = await api.put('/api/settings', { publicBaseUrl: next });
      setValue(settings.publicBaseUrl);
      toast.success(settings.publicBaseUrl ? 'URL pubblico salvato' : 'Si usa di nuovo il rilevamento automatico');
      setProbe(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function testUrl() {
    if (!info) return;
    setProbe({ state: 'running' });
    const started = performance.now();
    try {
      const target = new URL('/api/health', info.url).toString();
      const res = await fetch(target, { mode: 'cors', cache: 'no-store' }).catch(() => null);
      if (res && res.ok) setProbe({ state: 'ok', message: `Raggiungibile (${Math.round(performance.now() - started)} ms)` });
      else if (res) setProbe({ state: 'fail', message: `Risposta HTTP ${res.status}` });
      else {
        // Origine diversa senza CORS: si verifica almeno che l'host risponda.
        await fetch(target, { mode: 'no-cors', cache: 'no-store' });
        setProbe({ state: 'ok', message: 'L\'host risponde (verifica completa possibile solo dalla stessa origine)' });
      }
    } catch {
      setProbe({ state: 'fail', message: 'Non raggiungibile da questo browser' });
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="panel space-y-4 p-6">
        <h2 className="panel-title">
          <Globe aria-hidden="true" className="h-4 w-4" /> URL pubblico dei QR
        </h2>
        <p className="text-sm text-slate-500">
          Ogni QR codifica <span className="font-mono">URL pubblico + /p/codice</span>. Cambiando questo valore tutti i QR si aggiornano, senza modificare le schede.
        </p>
        {info ? (
          <dl data-testid="effective-url" className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <dt className="text-xs font-semibold text-slate-500">URL effettivo</dt>
            <dd className="break-all font-mono text-slate-800 sm:col-span-2" data-testid="effective-url-value">
              {info.url}
            </dd>
            <dt className="text-xs font-semibold text-slate-500">Origine</dt>
            <dd className="sm:col-span-2" data-testid="effective-url-source" data-source={info.source}>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{SOURCE_LABEL[info.source] || info.source}</span>
            </dd>
            {info.warning ? <dd className="text-xs text-amber-700 sm:col-span-3">{info.warning}</dd> : null}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Caricamento…</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={Stethoscope} onClick={testUrl} disabled={!info || probe?.state === 'running'}>
            Prova URL
          </Button>
          {probe && probe.state !== 'running' ? (
            <span data-testid="probe-result" data-state={probe.state} className={`text-sm ${probe.state === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {probe.message}
            </span>
          ) : null}
        </div>
      </div>

      <form
        className="panel space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h3 className="panel-title">
          <Save aria-hidden="true" className="h-4 w-4" /> Imposta un URL fisso
        </h3>
        <div>
          <label htmlFor="publicBaseUrl" className="field-label">
            URL pubblico (vuoto = automatico)
          </label>
          <input id="publicBaseUrl" className="field font-mono" placeholder="https://schede.esempio.it" value={value} onChange={(e) => setValue(e.target.value)} />
          {error ? (
            <p role="alert" className="mt-1 text-xs text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" icon={Save} disabled={busy}>
            Salva URL
          </Button>
          <Button variant="ghost" onClick={() => save('')} disabled={busy}>
            Torna all'automatico
          </Button>
        </div>
      </form>

      {info?.lanIps?.length ? (
        <div className="panel space-y-3 p-6">
          <h3 className="panel-title">
            <Network aria-hidden="true" className="h-4 w-4" /> IP rilevati sulla rete locale
          </h3>
          <ul className="space-y-2" data-testid="lan-ips">
            {info.lanIps.map((ip) => {
              const url = `http://${ip.address}:${info.port}`;
              return (
                <li key={ip.address} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                  <span>
                    <span className="font-mono text-slate-800">{url}</span> <span className="text-xs text-slate-400">({ip.interface})</span>
                  </span>
                  <Button size="sm" variant="soft" onClick={() => save(url)} disabled={busy}>
                    Usa questo
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
