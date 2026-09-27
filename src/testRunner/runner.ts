import {
  AssertionError,
  SkipError,
  type Requirement,
  type TestContext,
  type TestDefinition,
  type TestOutcome,
  type TestResult,
  type TestStatus,
} from './types';
import type { ResultsStore } from './store';
import { errorInfo, safeJson, toPlain, withTimeout } from '../utils/safe';

/**
 * Environment facts the runner needs to decide SKIPPED / NOT_CONFIGURED before
 * running anything. Provided by the app (or a fake in unit tests).
 */
export interface RunnerEnvironment {
  platform: 'android' | 'ios';
  profileId: string;
  dangerousAllowed: boolean;
  requirementStatus: (r: Requirement) => { ok: boolean; reason: string };
  makeContext: (def: TestDefinition, log: (line: string) => void) => TestContext;
}

export interface RunOptions {
  /** Caller confirmed the danger dialog for this specific test. */
  dangerConfirmed?: boolean;
  now?: () => Date;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** Why a test cannot run in this environment, or null if it can. */
export function precheck(def: TestDefinition, env: RunnerEnvironment, opts: RunOptions = {}): string | null {
  if (!def.platforms.includes(env.platform)) {
    return `SKIPPED WITH REASON: ${def.platformNote ?? `not applicable on ${env.platform}`}`;
  }
  if (def.profiles && !def.profiles.includes(env.profileId as never)) {
    return `Requires init profile ${def.profiles.join(' | ')} (current: ${env.profileId}). Switch profile on the Config screen and restart.`;
  }
  if (def.dangerous && !env.dangerousAllowed) {
    return 'Dangerous tests are disabled in this build (set ENABLE_DANGEROUS_TESTS=true for internal release builds).';
  }
  if (def.dangerous && !opts.dangerConfirmed) {
    return 'Dangerous test requires explicit confirmation.';
  }
  for (const r of def.requires ?? []) {
    const s = env.requirementStatus(r);
    if (!s.ok) return `NOT_CONFIGURED: ${s.reason}`;
  }
  return null;
}

export function gradePass(def: TestDefinition, outcome: TestOutcome | void): TestStatus {
  const kind = outcome?.kind ?? 'PASS';
  switch (kind) {
    case 'FAIL':
      return 'FAIL';
    case 'SKIPPED':
      return 'SKIPPED';
    case 'MANUAL':
      return 'MANUAL_VERIFICATION_REQUIRED';
    case 'PASS':
    default:
      if (def.verification === 'MANUAL') return 'MANUAL_VERIFICATION_REQUIRED';
      if (def.verification === 'LOCAL_ONLY') return 'VERIFIED';
      // A local method returning is NOT end-to-end proof.
      return 'LOCAL_PASS';
  }
}

export async function runTest(
  def: TestDefinition,
  store: ResultsStore,
  env: RunnerEnvironment,
  runId: string,
  opts: RunOptions = {},
): Promise<TestResult> {
  const now = opts.now ?? (() => new Date());
  const base: TestResult = {
    testId: def.id,
    testRunId: runId,
    status: 'RUNNING',
    logs: [],
    platform: env.platform,
    profileId: env.profileId,
  };

  const skip = precheck(def, env, opts);
  if (skip) {
    const t = now().toISOString();
    const r: TestResult = { ...base, status: 'SKIPPED', startedAt: t, finishedAt: t, durationMs: 0, note: skip };
    store.put(r);
    return r;
  }

  const started = now();
  store.put({ ...base, startedAt: started.toISOString() });
  const log = (line: string) => store.appendLog(def.id, `${new Date().toISOString().slice(11, 23)} ${line}`);
  const ctx = env.makeContext(def, log);

  let status: TestStatus;
  let actual: unknown;
  let note: string | undefined;
  let error: TestResult['error'];
  try {
    const outcome = await withTimeout(Promise.resolve().then(() => def.run(ctx)), def.timeoutMs ?? DEFAULT_TIMEOUT_MS, def.id);
    status = gradePass(def, outcome);
    actual = outcome?.output;
    note = outcome?.note;
  } catch (err) {
    if (err instanceof SkipError) {
      status = 'SKIPPED';
      note = err.message;
    } else {
      status = 'FAIL';
      error = errorInfo(err);
      note = err instanceof AssertionError ? `Assertion failed: ${err.message}` : `Unexpected error: ${error.message}`;
    }
  }
  const finished = now();
  const current = store.get(def.id);
  const result: TestResult = {
    ...base,
    logs: current?.logs ?? [],
    status,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs: finished.getTime() - started.getTime(),
    actual: toPlain(actual),
    note,
    error,
  };
  store.put(result);
  if (status === 'FAIL') log(`FAIL: ${note ?? safeJson(error)}`);
  return result;
}

/** Tests eligible for "RUN SAFE TEST SUITE". */
export function isSafeSuiteTest(def: TestDefinition): boolean {
  return !def.dangerous && !def.interactive && def.risk !== 'HIGH' && def.risk !== 'DESTRUCTIVE';
}

export async function runSuite(
  defs: readonly TestDefinition[],
  store: ResultsStore,
  env: RunnerEnvironment,
  runId: string,
  onProgress?: (done: number, total: number, current: TestDefinition) => void,
  shouldCancel?: () => boolean,
): Promise<TestResult[]> {
  const safe = defs.filter(isSafeSuiteTest);
  const results: TestResult[] = [];
  for (let i = 0; i < safe.length; i++) {
    if (shouldCancel?.()) break;
    onProgress?.(i, safe.length, safe[i]);
    results.push(await runTest(safe[i], store, env, runId));
    // Yield to the UI thread between tests so the app stays responsive.
    await new Promise<void>(res => setTimeout(res, 0));
  }
  return results;
}
