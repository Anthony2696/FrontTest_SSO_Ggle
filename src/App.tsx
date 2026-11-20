import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DebugPanel } from './components/DebugPanel';
import { CALLBACK_PATH } from './lib/session';
import { CallbackPage } from './pages/CallbackPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SessionPage } from './pages/SessionPage';

/**
 * Google puede devolver el código en cualquier ruta si la redirect_uri registrada
 * apunta a la raíz o a otra ruta local. Lo enviamos siempre a /auth/callback.
 */
function AuthParamCatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === CALLBACK_PATH) return;

    const query = new URLSearchParams(location.search);
    const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
    const hasAuthParams = ['code', 'error', 'error_description', 'state'].some(
      (key) => query.has(key) || fragment.has(key),
    );

    if (!hasAuthParams) return;

    navigate(
      { pathname: CALLBACK_PATH, search: location.search, hash: location.hash },
      { replace: true },
    );
  }, [location, navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthParamCatcher />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path={CALLBACK_PATH} element={<CallbackPage />} />
        <Route path="/sesion" element={<SessionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <DebugPanel />
    </BrowserRouter>
  );
}
