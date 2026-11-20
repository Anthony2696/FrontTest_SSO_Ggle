import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, exchangeCode } from '../api/lambda';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { CopyButton } from '../components/CopyButton';
import { config } from '../config';
import { clearPendingLogin, getPendingLogin, saveSession } from '../lib/session';

interface Failure {
  title: string;
  message: string;
  hint?: string;
  detail?: unknown;
}

function mergeAuthParams(search: string, hash: string): URLSearchParams {
  const params = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  fragment.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function hintFor(message: string): string | undefined {
  const text = message.toLowerCase();
  if (text.includes('cors') || text.includes('contactar')) {
    return 'Si el Lambda vive en API Gateway, habilita CORS para http://localhost:5173 (incluye el preflight OPTIONS) y revisa la URL configurada.';
  }
  if (text.includes('http 4')) {
    return 'Revisa la ruta del recurso, el método (GET/POST) y el formato del cuerpo que espera el Lambda.';
  }
  if (text.includes('http 5') || text.includes('timeout') || text.includes('excedió')) {
    return 'El Lambda falló o no respondió a tiempo. Revisa sus logs en CloudWatch.';
  }
  if (text.includes('código') || text.includes('code')) {
    return 'Los códigos de Google son de un solo uso y caducan rápido. Vuelve a iniciar el flujo desde el campus.';
  }
  return undefined;
}

function failureFor(caught: unknown): Failure {
  const apiError = caught instanceof ApiError ? caught : null;
  const message =
    apiError?.message ?? (caught instanceof Error ? caught.message : 'Error desconocido.');
  return {
    title: 'No pudimos completar el inicio de sesión',
    message,
    hint: hintFor(message),
    detail: apiError?.detail ?? null,
  };
}

function maskCode(code: string): string {
  return code.length > 14 ? `${code.slice(0, 10)}…${code.slice(-4)}` : `${code.slice(0, 4)}…`;
}

export function CallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pending] = useState(() => getPendingLogin());
  const [failure, setFailure] = useState<Failure | null>(null);
  const processed = useRef(false);

  const params = useMemo(
    () => mergeAuthParams(location.search, location.hash),
    [location.search, location.hash],
  );

  const code = params.get('code');
  const oauthError = params.get('error');
  const oauthErrorDescription = params.get('error_description');

  const diagnostics = useMemo(() => {
    const received: Record<string, string> = {};
    params.forEach((value, key) => {
      received[key] = key.toLowerCase() === 'code' ? maskCode(value) : value;
    });

    return JSON.stringify(
      {
        ruta: `${location.pathname}${location.search}${location.hash}`,
        recibido: received,
        redirectUriLocal: config.localRedirectUri,
        lambda: {
          url: config.lambdaUrl || '(sin configurar)',
          method: config.lambdaMethod,
          codeField: config.codeField,
        },
        campus: pending?.campusName ?? null,
        detalle: failure?.detail ?? null,
      },
      null,
      2,
    );
  }, [params, location.pathname, location.search, location.hash, pending, failure]);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    if (oauthError) {
      setFailure({
        title:
          oauthError === 'access_denied'
            ? 'Cancelaste el acceso en Google'
            : 'Google devolvió un error de autorización',
        message:
          oauthError === 'access_denied'
            ? 'No se autorizó el acceso a la cuenta de Google, por lo que no se generó ningún código.'
            : oauthErrorDescription || `Google devolvió el error "${oauthError}".`,
        detail: { error: oauthError, error_description: oauthErrorDescription },
      });
      return;
    }

    if (!code) {
      setFailure({
        title: 'No recibimos el código de Google',
        message:
          'La URL de regreso no incluye el parámetro code. Esto ocurre si la redirect URI configurada en Google y en el Lambda no apunta a esta aplicación local.',
        hint: `La URI local esperada es ${config.localRedirectUri}. Debe coincidir exactamente con la registrada en el cliente OAuth de Google y con la redirect_uri que genera el Lambda.`,
        detail: Object.fromEntries(params.entries()),
      });
      return;
    }

    let active = true;

    exchangeCode(code, pending?.campusName)
      .then((result) => {
        if (!active) return;

        saveSession({
          email: result.email,
          campusSlug: pending?.campusSlug,
          campusName: pending?.campusName,
          startedAt: new Date().toISOString(),
          raw: result.raw,
        });
        clearPendingLogin();
        navigate('/sesion', { replace: true });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setFailure(failureFor(caught));
      });

    return () => {
      active = false;
    };
  }, [code, navigate, oauthError, oauthErrorDescription, params, pending]);

  return (
    <div className="page">
      <AppHeader />

      <main className="auth-main">
        <section className="auth-panel" aria-live="polite">
          {failure ? (
            <>
              <div className="auth-icon auth-icon--error" aria-hidden="true">
                !
              </div>
              <h1>{failure.title}</h1>
              <p className="auth-text">{failure.message}</p>
              {failure.hint && <p className="auth-hint">{failure.hint}</p>}

              <details className="tech-details">
                <summary>Detalles técnicos</summary>
                <pre>{diagnostics}</pre>
                <CopyButton value={diagnostics} />
              </details>

              <div className="auth-actions">
                <Link className="button button--primary" to="/">
                  Volver a intentar
                </Link>
                <Link className="button button--ghost" to="/">
                  Ir al inicio
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="spinner spinner--large" aria-hidden="true" />
              <h1>Validando tu acceso</h1>
              <p className="auth-text">
                Estamos canjeando el código temporal de Google con el web service Lambda.
              </p>

              {pending?.campusName && (
                <p className="auth-campus">
                  Campus: <strong>{pending.campusName}</strong>
                </p>
              )}

              <ol className="auth-steps">
                <li className="is-done">Recibimos el código de autorización</li>
                <li className="is-active">Validando el código con el Lambda</li>
                <li>Creando tu sesión</li>
              </ol>

              <p className="auth-footnote">
                No cierres esta pestaña. Si el Lambda tarda demasiado, revisa la consola de
                depuración.
              </p>
            </>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
