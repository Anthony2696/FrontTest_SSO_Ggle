import { useState } from 'react';
import { config, IS_DEBUG_ENABLED } from '../config';
import { clearDebugEntries, useDebugEntries, type DebugEntry } from '../lib/debug';

function pretty(value: string | undefined): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour12: false });
}

function Entry({ entry }: { entry: DebugEntry }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={`debug-entry${entry.ok ? '' : ' debug-entry--error'}`}>
      <summary>
        <span className="debug-entry__time">{timeOf(entry.at)}</span>
        <span className="debug-entry__method">{entry.method}</span>
        <span className="debug-entry__status">
          {entry.status ? `HTTP ${entry.status}` : 'SIN RESPUESTA'}
        </span>
        <span className="debug-entry__duration">{entry.durationMs} ms</span>
      </summary>
      <div className="debug-entry__body">
        <div className="debug-field">
          <span className="debug-label">URL</span>
          <code>{entry.url}</code>
        </div>
        {entry.requestBody && (
          <div className="debug-field">
            <span className="debug-label">Request</span>
            <pre>{pretty(entry.requestBody)}</pre>
          </div>
        )}
        {entry.response && (
          <div className="debug-field">
            <span className="debug-label">Response</span>
            <pre>{pretty(entry.response)}</pre>
          </div>
        )}
        {entry.error && (
          <div className="debug-field">
            <span className="debug-label">Error</span>
            <pre>{entry.error}</pre>
          </div>
        )}
        <button type="button" className="debug-copy" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar JSON'}
        </button>
      </div>
    </details>
  );
}

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const entries = useDebugEntries();
  const hasConfig = Boolean(config.lambdaUrl);

  return (
    <div className="dev-tools">
      {config.usingMockFallback && (
        <span className="dev-badge" title="No hay VITE_LAMBDA_URL; se usa el mock local">
          MOCK LOCAL
        </span>
      )}

      {IS_DEBUG_ENABLED && (
        <>
          <button
            type="button"
            className={`dev-button${open ? ' is-active' : ''}`}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            λ Debug Lambda {entries.length > 0 ? `(${entries.length})` : ''}
          </button>

          {open && (
            <aside className="debug-panel" aria-label="Consola de depuración del Lambda">
              <header className="debug-panel__header">
                <div>
                  <strong>Depuración SSO</strong>
                  <span>Peticiones de esta sesión del navegador</span>
                </div>
                <div className="debug-panel__actions">
                  <button type="button" onClick={clearDebugEntries} disabled={!entries.length}>
                    Limpiar
                  </button>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
                    ✕
                  </button>
                </div>
              </header>

              <div className="debug-config">
                <div>
                  <span className="debug-label">Lambda</span>
                  <code>{hasConfig ? config.lambdaUrl : '(sin configurar)'}</code>
                </div>
                <div className="debug-config__row">
                  <span>{config.lambdaMethod}</span>
                  <span>{config.codeField}=…</span>
                  <span>{config.timeoutMs} ms</span>
                </div>
                <div>
                  <span className="debug-label">Redirect URI local</span>
                  <code>{config.localRedirectUri}</code>
                </div>
              </div>

              <div className="debug-entries">
                {entries.length === 0 ? (
                  <p className="debug-empty">
                    Aún no hay peticiones. Presiona INGRESAR en algún campus para ver el intercambio
                    con el Lambda.
                  </p>
                ) : (
                  entries.map((entry) => <Entry key={entry.id} entry={entry} />)
                )}
              </div>

              <p className="debug-note">
                Los códigos de Google son de un solo uso y caducan en minutos. Si repites una prueba,
                vuelve a iniciar el flujo desde el inicio.
              </p>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
