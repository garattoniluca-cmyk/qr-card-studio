import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // stato: 'loading' | 'in' | 'out' | 'offline'
  const [status, setStatus] = useState('loading');

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/api/auth/me');
      setStatus(me.authenticated ? 'in' : 'out');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => setStatus('out');
    window.addEventListener('qrcard:unauthorized', onUnauthorized);
    return () => window.removeEventListener('qrcard:unauthorized', onUnauthorized);
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      refresh,
      async login(password) {
        await api.post('/api/auth/login', { password });
        setStatus('in');
      },
      async logout() {
        await api.post('/api/auth/logout').catch(() => {});
        setStatus('out');
      },
    }),
    [status, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Protegge le pagine /admin: senza login reindirizza a /admin/login conservando la destinazione. */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="p-10 text-center text-sm text-slate-400">Caricamento…</div>;
  if (status === 'out') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  // 'offline': si mostra comunque la pagina, che segnalerà l'errore con un toast.
  return children;
}
