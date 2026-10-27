import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, LogOut, Plus, QrCode, Settings } from 'lucide-react';
import { Button } from './ui/Button.jsx';
import { useAuth } from '../lib/auth.jsx';

const navClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-control px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Un solo pulsante primario per schermata: nell'editor il primario è «Salva».
  const showNew = location.pathname === '/admin' || location.pathname === '/admin/';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-200">
              <QrCode aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">QR Card Studio</span>
              <span className="hidden text-xs text-slate-400 sm:block">Schede prodotto e QR fisici</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principale">
            <NavLink to="/admin" end className={navClass} title="Catalogo schede">
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
              <span className="hidden md:inline">Catalogo</span>
            </NavLink>
            <NavLink to="/admin/settings" className={navClass} title="Impostazioni">
              <Settings aria-hidden="true" className="h-4 w-4" />
              <span className="hidden md:inline">Impostazioni</span>
            </NavLink>
            {showNew ? (
              <Button variant="primary" icon={Plus} onClick={() => navigate('/admin/cards/new')}>
                <span className="hidden sm:inline">Nuova scheda</span>
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" title="Esci" aria-label="Esci" onClick={() => logout().then(() => navigate('/admin/login'))}>
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
