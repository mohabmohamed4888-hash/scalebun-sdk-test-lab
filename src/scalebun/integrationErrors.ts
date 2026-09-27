import { errorInfo } from '../utils/safe';

/**
 * Every exception/rejection that escapes a ScaleBun call made by the Test Lab
 * is captured here and shown on the Home screen. The app itself must never
 * crash because an SDK API rejects or is unavailable.
 */
export interface IntegrationError {
  at: string;
  where: string;
  name: string;
  message: string;
}

const MAX = 200;
const errors: IntegrationError[] = [];
const listeners = new Set<() => void>();

export function recordIntegrationError(where: string, err: unknown): void {
  const info = errorInfo(err);
  errors.unshift({ at: new Date().toISOString(), where, name: info.name, message: info.message });
  if (errors.length > MAX) errors.length = MAX;
  listeners.forEach(l => l());
}

export function getIntegrationErrors(): readonly IntegrationError[] {
  return errors;
}

export function clearIntegrationErrors(): void {
  errors.length = 0;
  listeners.forEach(l => l());
}

export function subscribeIntegrationErrors(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Run a synchronous SDK call; never throws, records failures. */
export function guard<T>(where: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    recordIntegrationError(where, err);
    return undefined;
  }
}

/** Run an async SDK call; never rejects, records failures. */
export async function guardAsync<T>(where: string, fn: () => Promise<T> | T): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    recordIntegrationError(where, err);
    return undefined;
  }
}
