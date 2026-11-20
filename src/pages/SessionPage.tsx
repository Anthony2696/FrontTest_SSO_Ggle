import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { clearPendingLogin, clearSession, getSession } from '../lib/session';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

export function SessionPage() {
  const navigate = useNavigate();
  const [session] = useState(() => getSession());

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  if (!session) return null;

  function handleLogout(): void {
    clearSession();
    clearPendingLogin();
    navigate('/', { replace: true });
  }

  return (
    <div className="page">
      <AppHeader />

      <main className="auth-main">
        <section className="auth-panel auth-panel--session">
          <div className="auth-icon auth-icon--success" aria-hidden="true">
            ✓
          </div>
          <p className="auth-eyebrow">Login SSO validado por AWS Lambda</p>
          <h1>Sesión iniciada</h1>
          <p className="auth-text">Bienvenido. La cuenta autenticada es:</p>

          <p className="session-email">{session.email}</p>

          <dl className="session-meta">
            {session.campusName && (
              <div>
                <dt>Campus</dt>
                <dd>{session.campusName}</dd>
              </div>
            )}
            <div>
              <dt>Fecha de acceso</dt>
              <dd>{formatDate(session.startedAt)}</dd>
            </div>
            <div>
              <dt>Almacenamiento</dt>
              <dd>sessionStorage (solo esta pestaña)</dd>
            </div>
          </dl>

          <details className="tech-details tech-details--left">
            <summary>Respuesta del Lambda</summary>
            <pre>{JSON.stringify(session.raw, null, 2)}</pre>
          </details>

          <div className="auth-actions">
            <button type="button" className="button button--primary" onClick={handleLogout}>
              Cerrar sesión
            </button>
            <Link className="button button--ghost" to="/">
              Volver al inicio
            </Link>
          </div>

          <p className="auth-footnote">
            Este simulador solo guarda el email que devolvió el Lambda. Los tokens de Google
            permanecen en el backend.
          </p>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
