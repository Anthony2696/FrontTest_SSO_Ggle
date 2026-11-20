import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, requestLoginUrl } from '../api/lambda';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { CampusCard } from '../components/CampusCard';
import { config } from '../config';
import { campuses, lastRowCampuses } from '../data/campuses';
import { clearPendingLogin, getSession, savePendingLogin } from '../lib/session';
import type { Campus } from '../types';

interface FlowError {
  message: string;
  detail?: string;
}

export function HomePage() {
  const [busyCampus, setBusyCampus] = useState<string | null>(null);
  const [error, setError] = useState<FlowError | null>(null);
  const session = getSession();

  async function handleEnter(campus: Campus): Promise<void> {
    if (busyCampus) return;

    setError(null);
    setBusyCampus(campus.slug);
    clearPendingLogin();

    try {
      // Paso 1: el Lambda genera la URL de Google con code="".
      const result = await requestLoginUrl(campus.name);

      savePendingLogin({
        campusSlug: campus.slug,
        campusName: campus.name,
        redirectUri: result.redirectUri || config.localRedirectUri,
        authUrl: result.urlLogin,
        startedAt: new Date().toISOString(),
      });

      // Paso 2: navegamos a Google (respeta el flujo OAuth, no es un fetch).
      window.location.assign(result.urlLogin);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      const detail =
        apiError?.detail !== undefined
          ? typeof apiError.detail === 'string'
            ? apiError.detail
            : JSON.stringify(apiError.detail, null, 2)
          : caught instanceof Error
            ? caught.message
            : String(caught);

      setError({
        message: apiError?.message ?? 'Ocurrió un error inesperado al contactar al Lambda.',
        detail,
      });
      setBusyCampus(null);
    }
  }

  return (
    <div className="page">
      <AppHeader />

      <main className="home-main">
        <div className="home-heading-row">
          <h5 className="content-heading">Selecciona campus</h5>
          {session && (
            <Link className="session-hint" to="/sesion">
              Sesión activa: <strong>{session.email}</strong>
            </Link>
          )}
        </div>

        {error && (
          <div className="alert alert--error" role="alert">
            <div>
              <strong>No se pudo iniciar el flujo SSO.</strong>
              <p>{error.message}</p>
              {error.detail && (
                <details>
                  <summary>Detalle técnico</summary>
                  <pre>{error.detail}</pre>
                </details>
              )}
            </div>
            <button type="button" className="alert__close" onClick={() => setError(null)} aria-label="Cerrar aviso">
              ✕
            </button>
          </div>
        )}

        <div className="campus-grid" aria-busy={Boolean(busyCampus)}>
          {campuses.map((campus) => (
            <CampusCard
              key={campus.slug}
              campus={campus}
              busy={busyCampus === campus.slug}
              disabled={Boolean(busyCampus)}
              onEnter={handleEnter}
            />
          ))}
        </div>

        <div className="campus-grid campus-grid--tail" aria-busy={Boolean(busyCampus)}>
          {lastRowCampuses.map((campus) => (
            <CampusCard
              key={campus.slug}
              campus={campus}
              variant="tail"
              busy={busyCampus === campus.slug}
              disabled={Boolean(busyCampus)}
              onEnter={handleEnter}
            />
          ))}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
