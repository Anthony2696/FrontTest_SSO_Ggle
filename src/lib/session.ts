import type { PendingLogin, UserSession } from '../types';

const PENDING_KEY = 'sica.sso.pending';
const SESSION_KEY = 'sica.sso.session';
const CALLBACK_PATH = '/auth/callback';

function readJson<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sessionStorage no disponible */
  }
}

export function savePendingLogin(pending: PendingLogin): void {
  writeJson(PENDING_KEY, pending);
}

export function getPendingLogin(): PendingLogin | null {
  return readJson<PendingLogin>(PENDING_KEY);
}

export function saveSession(session: UserSession): void {
  writeJson(SESSION_KEY, session);
}

export function getSession(): UserSession | null {
  return readJson<UserSession>(SESSION_KEY);
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function clearPendingLogin(): void {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
}

export { CALLBACK_PATH };
