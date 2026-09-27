import axios, { type AxiosResponse } from 'axios';

/**
 * Client for tools/network-test-server. The base URL comes from
 * NETWORK_TEST_SERVER_URL so physical devices can use the dev machine's LAN IP
 * (Android emulator: http://10.0.2.2:4545, iOS simulator: http://localhost:4545).
 */
export interface FetchResult {
  ok: boolean;
  status: number;
  durationMs: number;
  bytes: number;
  body?: unknown;
  error?: string;
  redirected?: boolean;
  url?: string;
}

export async function labFetch(base: string, path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<FetchResult> {
  const started = Date.now();
  const controller = init.signal ? null : new AbortController();
  const timer = init.timeoutMs && controller ? setTimeout(() => controller.abort(), init.timeoutMs) : null;
  try {
    const res = await fetch(`${base}${path}`, { ...init, signal: init.signal ?? controller?.signal });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON body
    }
    return { ok: res.ok, status: res.status, durationMs: Date.now() - started, bytes: text.length, body, redirected: res.redirected, url: res.url };
  } catch (err) {
    return { ok: false, status: 0, durationMs: Date.now() - started, bytes: 0, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function labAxios(
  base: string,
  method: 'get' | 'post',
  path: string,
  opts: { data?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<FetchResult> {
  const started = Date.now();
  try {
    const res: AxiosResponse = await axios.request({
      method,
      url: `${base}${path}`,
      data: opts.data,
      headers: opts.headers,
      timeout: opts.timeoutMs ?? 10000,
      validateStatus: () => true,
    });
    const bytes = typeof res.data === 'string' ? res.data.length : JSON.stringify(res.data ?? '').length;
    return { ok: res.status >= 200 && res.status < 300, status: res.status, durationMs: Date.now() - started, bytes, body: res.data };
  } catch (err) {
    return { ok: false, status: 0, durationMs: Date.now() - started, bytes: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
