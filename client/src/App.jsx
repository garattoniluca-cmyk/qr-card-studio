import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AdminLayout } from './components/AdminLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PublicCardPage } from './pages/PublicCardPage.jsx';
import { QrTagPage } from './pages/QrTagPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="cards/new" element={<EditorPage />} />
            <Route path="cards/:id" element={<EditorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route
            path="/admin/cards/:id/tag"
            element={
              <RequireAuth>
                <QrTagPage />
              </RequireAuth>
            }
          />
          <Route path="/p/:publicId" element={<PublicCardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
