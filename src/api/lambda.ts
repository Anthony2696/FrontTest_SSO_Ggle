import { config } from '../config';
import { addDebugEntry } from '../lib/debug';
import type { LambdaEnvelope, LoginUrlPayload, UserPayload } from '../types';

export class ApiError extends Error {
  readonly detail?: unknown;
  readonly status?: number;

  constructor(message: string, options?: { detail?: unknown; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.detail = options?.detail;
    this.status = options?.status;
  }
}

interface LambdaCallResult {
  envelope: LambdaEnvelope;
  rawText: string;
  status: number;
}

function buildParams(code: string, campusName?: string): Record<string, string> {
  const params: Record<string, string> = { ...config.extraParams };
  params[config.codeField] = code;
  if (config.sendRedirectUri) params.redirect_uri = config.localRedirectUri;
  if (config.sendCampus && campusName) params.campus = campusName;
  return params;
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* contexto no seguro */
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function callLambda(code: string, campusName?: string): Promise<LambdaCallResult> {
  if (!config.lambdaUrl) {
    throw new ApiError(
      'No hay URL de Lambda configurada. Define VITE_LAMBDA_URL en el archivo .env y reinicia Vite.',
    );
  }

  const params = buildParams(code, campusName);
  const method = config.lambdaMethod;
  let url = config.lambdaUrl;
  let body: string | undefined;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...config.lambdaHeaders,
  };

  if (method === 'GET') {
    const target = new URL(config.lambdaUrl);
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
    url = target.toString();
  } else if (config.lambdaBodyFormat === 'form') {
    body = new URLSearchParams(params).toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    body = JSON.stringify(params);
    headers['Content-Type'] = 'application/json';
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : body,
      signal: controller.signal,
      mode: 'cors',
    });
    const rawText = await response.text();
    const durationMs = Date.now() - startedAt;
    const parsed = parseJson(rawText);

    addDebugEntry({
      id: newId(),
      at: new Date().toISOString(),
      method,
      url,
      requestBody: body,
      status: response.status,
      ok: response.ok,
      durationMs,
      response: rawText,
    });

    if (!response.ok) {
      throw new ApiError(`El Lambda respondió HTTP ${response.status}.`, {
        status: response.status,
        detail: parsed ?? rawText,
      });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ApiError('El Lambda devolvió una respuesta que no es JSON válido.', {
        status: response.status,
        detail: rawText,
      });
    }

    return { envelope: parsed as LambdaEnvelope, rawText, status: response.status };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (error instanceof ApiError) throw error;

    const aborted = error instanceof DOMException && error.name === 'AbortError';
    const message = aborted
      ? `La petición al Lambda excedió ${config.timeoutMs} ms.`
      : 'No se pudo contactar al Lambda. Revisa la URL, que el servicio esté arriba y que CORS permita el origen local.';

    addDebugEntry({
      id: newId(),
      at: new Date().toISOString(),
      method,
      url,
      requestBody: body,
      ok: false,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(message, {
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function assertOkEnvelope(envelope: LambdaEnvelope): void {
  const status = String(envelope?.s ?? '').toUpperCase();
  if (status !== 'OK') {
    throw new ApiError(envelope?.m || 'El Lambda rechazó la solicitud.', {
      detail: envelope,
    });
  }
}

function assertHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new ApiError('El Lambda no devolvió una url_login válida.', { detail: value });
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApiError('La url_login devuelta por el Lambda no es una URL válida.', {
      detail: value,
    });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ApiError('La url_login devuelta por el Lambda usa un protocolo no permitido.', {
      detail: value,
    });
  }
  return parsed.toString();
}

export interface LoginUrlResult {
  urlLogin: string;
  redirectUri?: string;
  raw: LambdaEnvelope;
}

/** Paso 1 del flujo: pide al Lambda la URL de login de Google enviando code="". */
export async function requestLoginUrl(campusName?: string): Promise<LoginUrlResult> {
  const { envelope } = await callLambda('', campusName);
  assertOkEnvelope(envelope);

  const payload = envelope.d as Partial<LoginUrlPayload> | null;
  if (!payload || payload.tipo !== 'url_login' || !payload.data) {
    throw new ApiError(
      'El Lambda respondió OK pero no devolvió d.tipo = "url_login" con d.data.url_login.',
      { detail: envelope },
    );
  }

  return {
    urlLogin: assertHttpUrl(payload.data.url_login),
    redirectUri: payload.data.redirect_uri,
    raw: envelope,
  };
}

export interface ExchangeCodeResult {
  email: string;
  profile: UserPayload;
  raw: LambdaEnvelope;
}

/** Paso 4 del flujo: envía el código temporal de Google al Lambda y obtiene el email. */
export async function exchangeCode(code: string, campusName?: string): Promise<ExchangeCodeResult> {
  if (!code) throw new ApiError('No se recibió el código de autorización de Google.');

  const { envelope } = await callLambda(code, campusName);
  assertOkEnvelope(envelope);

  const profile = envelope.d as UserPayload | null;
  const email = profile?.email;
  if (typeof email !== 'string' || !email) {
    throw new ApiError('El Lambda no devolvió el email del usuario en d.email.', {
      detail: envelope,
    });
  }

  return { email, profile: profile as UserPayload, raw: envelope };
}
