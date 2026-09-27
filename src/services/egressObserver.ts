/**
 * Egress observer — a transparent, pass-through `fetch` wrapper installed
 * BEFORE the ScaleBun SDK is imported (see index.js).
 *
 * Purpose: let privacy/redaction tests make "TRANSMITTED" assertions on-device.
 * The SDK's JS lanes (/batch events, sessions, errors, logs, network, engage)
 * upload with global fetch, so every such upload passes through here. For each
 * request we keep ONLY: method, host, path (no query), status, timing, byte
 * size, and — for SDK-bound bodies — whether any registered fake-PII "needle"
 * occurs in the body/URL. Bodies, headers and query strings are never stored,
 * so the client key header never enters the observer's memory.
 *
 * Limits (stated, not hidden):
 *  - Native uploads (replay frames via the native outbox, native crash drain,
 *    OTA downloads) do not go through JS fetch and are invisible here.
 *  - Non-string bodies (Blob/FormData/ArrayBuffer) are marked `unscanned`.
 *
 * It never alters requests or responses and never throws into the caller.
 */

export interface EgressRecord {
  seq: number;
  ts: number;
  method: string;
  host: string;
  path: string;
  sdk: boolean;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  bytesOut?: number;
  bodyScan: 'scanned' | 'unscanned' | 'none';
  error?: string;
  needleHits: string[];
}

interface Needle {
  id: string;
  value: string;
  hits: number;
  hitPaths: string[];
}

type Listener = () => void;

const MAX_RECORDS = 600;
export const SCALEBUN_HOST = 'api.scalebun.com';

function splitUrl(url: string): { host: string; path: string } {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)([^?#]*)/i.exec(url);
  if (!m) return { host: '(relative)', path: url.split('?')[0] ?? url };
  return { host: m[1].replace(/^[^@]*@/, ''), path: m[2] || '/' };
}

function urlOf(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'url' in input) return String((input as { url: unknown }).url);
  return String(input);
}

export class EgressObserver {
  private records: EgressRecord[] = [];
  private needles = new Map<string, Needle>();
  private listeners = new Set<Listener>();
  private seq = 0;
  private installed = false;
  private enabled = true;
  sdkHosts = new Set<string>([SCALEBUN_HOST]);

  get isInstalled(): boolean {
    return this.installed;
  }

  install(target: { fetch?: typeof fetch } = globalThis): void {
    if (this.installed || typeof target.fetch !== 'function') return;
    const original = target.fetch;
    const wrapped = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let rec: EgressRecord | null = null;
      try {
        rec = this.begin(input, init);
      } catch {
        rec = null;
      }
      const started = Date.now();
      const p = original.call(globalThis, input as RequestInfo, init);
      if (!rec) return p;
      const r = rec;
      return p.then(
        res => {
          r.status = res.status;
          r.ok = res.ok;
          r.durationMs = Date.now() - started;
          this.emit();
          return res;
        },
        err => {
          r.error = err instanceof Error ? err.message : String(err);
          r.durationMs = Date.now() - started;
          this.emit();
          throw err;
        },
      );
    };
    target.fetch = wrapped as typeof fetch;
    this.installed = true;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  private begin(input: unknown, init?: RequestInit): EgressRecord | null {
    if (!this.enabled) return null;
    const url = urlOf(input);
    const { host, path } = splitUrl(url);
    const sdk = this.sdkHosts.has(host) || /\/api\/v1\//.test(path);
    const body = init?.body;
    let bodyScan: EgressRecord['bodyScan'] = 'none';
    let bytesOut: number | undefined;
    const needleHits: string[] = [];
    if (typeof body === 'string') {
      bodyScan = 'scanned';
      bytesOut = body.length;
    } else if (body != null) {
      bodyScan = 'unscanned';
    }
    // Needles are scanned in EVERY outgoing request that targets an SDK host,
    // in both the URL and a string body. App requests are not scanned: the
    // Test Lab sends needles to its own test server on purpose.
    if (sdk && this.needles.size > 0) {
      const haystacks = [url, typeof body === 'string' ? body : ''];
      for (const n of this.needles.values()) {
        if (haystacks.some(h => h.includes(n.value))) {
          n.hits += 1;
          if (n.hitPaths.length < 10) n.hitPaths.push(path);
          needleHits.push(n.id);
        }
      }
    }
    const rec: EgressRecord = {
      seq: ++this.seq,
      ts: Date.now(),
      method: (init?.method ?? 'GET').toUpperCase(),
      host,
      path,
      sdk,
      bytesOut,
      bodyScan,
      needleHits,
    };
    this.records.push(rec);
    if (this.records.length > MAX_RECORDS) this.records.splice(0, this.records.length - MAX_RECORDS);
    this.emit();
    return rec;
  }

  /** Register a fake-PII value that must (or must not) appear in SDK uploads. */
  addNeedle(id: string, value: string): void {
    if (value.length < 8) throw new Error('needle too short — would produce false positives');
    this.needles.set(id, { id, value, hits: 0, hitPaths: [] });
  }

  needleResult(id: string): { hits: number; hitPaths: string[] } | undefined {
    const n = this.needles.get(id);
    return n ? { hits: n.hits, hitPaths: [...n.hitPaths] } : undefined;
  }

  removeNeedle(id: string): void {
    this.needles.delete(id);
  }

  /** Records strictly after `seq` (use `mark()` before generating traffic). */
  since(seq: number): EgressRecord[] {
    return this.records.filter(r => r.seq > seq);
  }

  mark(): number {
    return this.seq;
  }

  all(): readonly EgressRecord[] {
    return this.records;
  }

  sdkSummary(sinceSeq = 0): { requests: number; failures: number; hosts: string[]; paths: Record<string, number>; unscanned: number } {
    const rs = this.since(sinceSeq).filter(r => r.sdk);
    const paths: Record<string, number> = {};
    for (const r of rs) {
      const key = `${r.method} ${r.path.replace(/[0-9a-f]{8,}|c[a-z0-9]{20,}/gi, ':id')} → ${r.status ?? r.error ?? 'pending'}`;
      paths[key] = (paths[key] ?? 0) + 1;
    }
    return {
      requests: rs.length,
      failures: rs.filter(r => r.error || (r.status !== undefined && r.status >= 400)).length,
      hosts: [...new Set(rs.map(r => r.host))],
      paths,
      unscanned: rs.filter(r => r.bodyScan === 'unscanned').length,
    };
  }

  hostsSince(seq: number): string[] {
    return [...new Set(this.since(seq).map(r => r.host))];
  }

  clear(): void {
    this.records = [];
    this.emit();
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // never let a UI listener break the network path
      }
    }
  }
}

export const egressObserver = new EgressObserver();
