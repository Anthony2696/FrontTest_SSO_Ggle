import { useSyncExternalStore } from 'react';
import { IS_DEBUG_ENABLED } from '../config';

export interface DebugEntry {
  id: string;
  at: string;
  method: string;
  url: string;
  requestBody?: string;
  status?: number;
  ok: boolean;
  durationMs: number;
  response?: string;
  error?: string;
}

type Listener = () => void;

const MAX_ENTRIES = 30;
const STORAGE_KEY = 'sica.debug.entries';

function loadEntries(): DebugEntry[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DebugEntry[]).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persistEntries(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* sessionStorage no disponible */
  }
}

const listeners = new Set<Listener>();
let entries: DebugEntry[] = loadEntries();

function notify(): void {
  persistEntries();
  listeners.forEach((listener) => listener());
}

function clip(value: string | undefined, max = 8000): string | undefined {
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max)}\n… (truncado)`;
}

export function addDebugEntry(entry: DebugEntry): void {
  if (!IS_DEBUG_ENABLED) return;

  const safeEntry: DebugEntry = {
    ...entry,
    requestBody: clip(entry.requestBody),
    response: clip(entry.response),
    error: clip(entry.error),
  };
  entries = [safeEntry, ...entries].slice(0, MAX_ENTRIES);
  notify();
}

export function clearDebugEntries(): void {
  entries = [];
  notify();
}

export function getDebugEntries(): DebugEntry[] {
  return entries;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDebugEntries(): DebugEntry[] {
  return useSyncExternalStore(subscribe, getDebugEntries, getDebugEntries);
}
