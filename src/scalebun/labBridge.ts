import type { EngagePromptController, UseOtaUpdateReturn, PushNotification, OtaEvent } from '@scalebun/react-native';

/**
 * Bridge between React-mounted SDK surfaces (hooks, providers, boundaries) and
 * imperative tests. Components register their live controllers here; tests
 * call them through TestContext.bridge. Type-only SDK imports — no runtime.
 */

export interface CallbackLogEntry {
  at: string;
  kind: string;
  detail: unknown;
}

type Waiter = { match: (e: CallbackLogEntry) => boolean; resolve: (e: CallbackLogEntry) => void };

class CallbackLog {
  private entries: CallbackLogEntry[] = [];
  private listeners = new Set<() => void>();
  private waiters: Waiter[] = [];

  push(kind: string, detail: unknown): void {
    const entry = { at: new Date().toISOString(), kind, detail };
    this.entries.unshift(entry);
    if (this.entries.length > 200) this.entries.length = 200;
    this.waiters = this.waiters.filter(w => {
      if (w.match(entry)) {
        w.resolve(entry);
        return false;
      }
      return true;
    });
    this.listeners.forEach(l => l());
  }

  list(): readonly CallbackLogEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
    this.listeners.forEach(l => l());
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Resolve with the first entry matching `match` (null on timeout). */
  waitFor(match: (e: CallbackLogEntry) => boolean, timeoutMs: number): Promise<CallbackLogEntry | null> {
    return new Promise(resolve => {
      const w: Waiter = {
        match,
        resolve: e => {
          clearTimeout(t);
          resolve(e);
        },
      };
      const t = setTimeout(() => {
        this.waiters = this.waiters.filter(x => x !== w);
        resolve(null);
      }, timeoutMs);
      this.waiters.push(w);
    });
  }
}

export interface LabBridge {
  engage: EngagePromptController | null;
  ota: UseOtaUpdateReturn | null;
  navigate: (route: string, params?: Record<string, unknown>) => boolean;
  /** Arms the error-boundary probe; the next render of the probe throws `message`. */
  triggerBoundaryError: ((message: string) => void) | null;
  pushLog: CallbackLog;
  otaLog: CallbackLog;
  engageLog: CallbackLog;
  boundaryLog: CallbackLog;
  lifecycleLog: CallbackLog;
  recordPush: (kind: 'foreground' | 'opened' | 'cold-start', n: PushNotification) => void;
  recordOta: (e: OtaEvent) => void;
}

export const labBridge: LabBridge = {
  engage: null,
  ota: null,
  navigate: () => false,
  triggerBoundaryError: null,
  pushLog: new CallbackLog(),
  otaLog: new CallbackLog(),
  engageLog: new CallbackLog(),
  boundaryLog: new CallbackLog(),
  lifecycleLog: new CallbackLog(),
  recordPush(kind, n) {
    this.pushLog.push(kind, { title: n.title, body: n.body, data: n.data, messageId: n.messageId });
  },
  recordOta(e) {
    this.otaLog.push(e.type, e);
  },
};
