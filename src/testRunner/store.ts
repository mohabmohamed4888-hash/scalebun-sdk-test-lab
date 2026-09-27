import type { TestResult, TestStatus } from './types';

/**
 * In-memory results store with pluggable persistence (AsyncStorage in the app,
 * nothing in Jest). Results are keyed by testId and belong to one testRunId.
 */
export interface ResultsPersistence {
  load: () => Promise<Record<string, TestResult> | null>;
  save: (results: Record<string, TestResult>) => Promise<void>;
}

type Listener = () => void;

export class ResultsStore {
  private results: Record<string, TestResult> = {};
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private persistence?: ResultsPersistence) {}

  async hydrate(): Promise<void> {
    const loaded = await this.persistence?.load();
    if (loaded) {
      // A RUNNING result from a previous process means the app died mid-test
      // (e.g. native crash test) — surface it instead of leaving it spinning.
      for (const r of Object.values(loaded)) {
        if (r.status === 'RUNNING') {
          r.status = 'MANUAL_VERIFICATION_REQUIRED';
          r.note = `${r.note ? r.note + ' ' : ''}Process ended while this test was RUNNING (expected for crash/restart tests). Verify in the dashboard.`;
        }
      }
      this.results = loaded;
      this.emit();
    }
  }

  get(testId: string): TestResult | undefined {
    return this.results[testId];
  }

  all(): TestResult[] {
    return Object.values(this.results);
  }

  status(testId: string): TestStatus {
    return this.results[testId]?.status ?? 'NOT_RUN';
  }

  put(result: TestResult): void {
    this.results = { ...this.results, [result.testId]: result };
    this.emit();
    this.scheduleSave();
  }

  update(testId: string, patch: Partial<TestResult>): void {
    const cur = this.results[testId];
    if (!cur) return;
    this.put({ ...cur, ...patch });
  }

  appendLog(testId: string, line: string): void {
    const cur = this.results[testId];
    if (!cur) return;
    const logs = cur.logs.length >= 200 ? [...cur.logs.slice(-199), line] : [...cur.logs, line];
    this.results = { ...this.results, [testId]: { ...cur, logs } };
    this.emit();
  }

  /** Human confirmation after checking the dashboard / verifier output. */
  markVerified(testId: string, by: 'tester' | 'verifier', note?: string): void {
    this.update(testId, { status: 'VERIFIED', verifiedBy: by, note: note ?? this.results[testId]?.note });
  }

  markFailed(testId: string, note: string): void {
    this.update(testId, { status: 'FAIL', note });
  }

  reset(): void {
    this.results = {};
    this.emit();
    this.scheduleSave();
  }

  counts(testIds: readonly string[]): Record<TestStatus, number> {
    const c: Record<TestStatus, number> = {
      NOT_RUN: 0,
      RUNNING: 0,
      LOCAL_PASS: 0,
      VERIFIED: 0,
      FAIL: 0,
      MANUAL_VERIFICATION_REQUIRED: 0,
      SKIPPED: 0,
    };
    for (const id of testIds) c[this.status(id)] += 1;
    return c;
  }

  lastFinished(): TestResult | undefined {
    return this.all()
      .filter(r => r.finishedAt)
      .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1))[0];
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async flushNow(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    await this.persistence?.save(this.results);
  }

  private scheduleSave(): void {
    if (!this.persistence) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persistence?.save(this.results).catch(() => undefined);
    }, 250);
  }

  private emit(): void {
    this.listeners.forEach(l => l());
  }
}
