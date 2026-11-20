export type LambdaHttpMethod = 'GET' | 'POST';
export type LambdaBodyFormat = 'json' | 'form';

export interface AppConfig {
  /** Endpoint del web service Lambda. Si está vacío en desarrollo se usa el mock local. */
  lambdaUrl: string;
  lambdaMethod: LambdaHttpMethod;
  lambdaBodyFormat: LambdaBodyFormat;
  /** Nombre del parámetro que espera el Lambda para el código de Google. */
  codeField: string;
  /** Parámetros extra enviados siempre al Lambda (por ejemplo api_key). */
  extraParams: Record<string, string>;
  /** Cabeceras HTTP extra (por ejemplo x-api-key para API Gateway). */
  lambdaHeaders: Record<string, string>;
  /** Enviar redirect_uri local al Lambda para que genere url_login con esa URI. */
  sendRedirectUri: boolean;
  /** URI local donde Google/Lambda devolverán el código. */
  localRedirectUri: string;
  /** Enviar el campus seleccionado al Lambda. */
  sendCampus: boolean;
  timeoutMs: number;
  /** true cuando no hay VITE_LAMBDA_URL y se está usando el mock local. */
  usingMockFallback: boolean;
}

const DEFAULT_MOCK_URL = 'http://localhost:4000/dev';
const DEFAULT_TIMEOUT_MS = 20_000;

function readEnv(key: string): string {
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readBool(key: string, fallback: boolean): boolean {
  const value = readEnv(key).toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'si', 'sí'].includes(value);
}

function readJsonParams(key: string): Record<string, string> {
  const raw = readEnv(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([k, value]) => [k, String(value)]),
    );
  } catch {
    console.warn(`[config] ${key} no es un JSON válido; se ignora.`);
    return {};
  }
}

const configuredUrl = readEnv('VITE_LAMBDA_URL');
const usingMockFallback = !configuredUrl && import.meta.env.DEV;

export const config: AppConfig = {
  lambdaUrl: configuredUrl || (usingMockFallback ? DEFAULT_MOCK_URL : ''),
  lambdaMethod: readEnv('VITE_LAMBDA_METHOD').toUpperCase() === 'GET' ? 'GET' : 'POST',
  lambdaBodyFormat: readEnv('VITE_LAMBDA_BODY_FORMAT').toLowerCase() === 'form' ? 'form' : 'json',
  codeField: readEnv('VITE_LAMBDA_CODE_FIELD') || 'code',
  extraParams: readJsonParams('VITE_LAMBDA_EXTRA_PARAMS'),
  lambdaHeaders: readJsonParams('VITE_LAMBDA_HEADERS'),
  sendRedirectUri: readBool('VITE_SEND_REDIRECT_URI', true),
  localRedirectUri:
    readEnv('VITE_LOCAL_REDIRECT_URI') || `${window.location.origin}/auth/callback`,
  sendCampus: readBool('VITE_SEND_CAMPUS', false),
  timeoutMs: Number(readEnv('VITE_LAMBDA_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS,
  usingMockFallback,
};

export const IS_DEBUG_ENABLED = import.meta.env.DEV && readBool('VITE_SHOW_DEBUG', true);
