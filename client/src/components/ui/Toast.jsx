import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

const ToastContext = createContext(null);

/** Notifiche brevi in basso a destra. Gli errori usano role="alert", le conferme role="status". */
export function ToastProvider({ children, duration = 3200 }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const show = useCallback(
    (message, { type = 'success' } = {}) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    },
    [duration],
  );
  const value = useMemo(
    () => ({ success: (m) => show(m, { type: 'success' }), error: (m) => show(m, { type: 'error' }) }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            data-testid="toast"
            data-type={t.type}
            className="pointer-events-auto flex items-center gap-3 rounded-control bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
          >
            {t.type === 'error' ? (
              <TriangleAlert aria-hidden="true" className="h-4 w-4 text-rose-400" />
            ) : (
              <CircleCheck aria-hidden="true" className="h-4 w-4 text-emerald-400" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast va usato dentro ToastProvider');
  return ctx;
}
