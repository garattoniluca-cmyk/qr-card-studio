import { SearchX } from 'lucide-react';

/** Pagina 404 curata: usata per indirizzi inesistenti e schede non pubblicate. */
export function NotFoundPage({ title = 'Pagina non trovata', message = "L'indirizzo che hai aperto non esiste o non è più disponibile." }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div data-testid="not-found" className="mx-auto max-w-md rounded-card border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <SearchX aria-hidden="true" className="h-8 w-8" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Errore 404</p>
        <h1 className="mt-1 text-lg font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
