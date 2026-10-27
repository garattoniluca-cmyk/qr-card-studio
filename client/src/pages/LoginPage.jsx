import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, QrCode } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../lib/auth.jsx';

function safeNext(raw) {
  // Solo percorsi interni dell'area admin.
  return raw && raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin';
}

export function LoginPage() {
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  if (status === 'in') return <Navigate to={next} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Password non corretta.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-200">
            <QrCode aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Accesso al gestionale</h1>
            <p className="text-xs text-slate-500">QR Card Studio</p>
          </div>
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            Password amministratore
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-control border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" icon={LogIn} className="w-full justify-center" disabled={busy}>
          Entra
        </Button>
      </form>
    </div>
  );
}
