/**
 * Unit tests for the Test Lab runner. The RunnerEnvironment is a small fake
 * (platform, requirement answers, context factory) — the ScaleBun SDK is NOT
 * involved here; SDK behaviour is only ever tested on-device.
 */
import { ResultsStore } from '../src/testRunner/store';
import { runTest, runSuite, precheck, gradePass, isSafeSuiteTest, type RunnerEnvironment } from '../src/testRunner/runner';
import { AssertionError, SkipError, type TestContext, type TestDefinition } from '../src/testRunner/types';

function def(over: Partial<TestDefinition> = {}): TestDefinition {
  return {
    id: 'T-1',
    category: 'Analytics',
    name: 'n',
    description: 'd',
    risk: 'SAFE',
    platforms: ['android', 'ios'],
    preconditions: [],
    expectedLocal: 'l',
    expectedScaleBun: 's',
    dashboardLocation: 'x',
    covers: [],
    verification: 'DASHBOARD',
    run: async () => undefined,
    ...over,
  };
}

function env(over: Partial<RunnerEnvironment> = {}): RunnerEnvironment {
  return {
    platform: 'android',
    profileId: 'default',
    dangerousAllowed: true,
    requirementStatus: () => ({ ok: true, reason: '' }),
    makeContext: (d, log) =>
      ({
        testId: d.id,
        log,
        expect: (c: unknown, m: string) => {
          if (!c) throw new AssertionError(m);
        },
      }) as unknown as TestContext,
    ...over,
  };
}

describe('precheck', () => {
  it('skips with reason on unsupported platform', () => {
    expect(precheck(def({ platforms: ['ios'], platformNote: 'SKAN is iOS-only' }), env())).toMatch(/SKIPPED WITH REASON: SKAN is iOS-only/);
  });
  it('requires the right profile', () => {
    expect(precheck(def({ profiles: ['no-replay'] }), env())).toMatch(/Requires init profile no-replay/);
    expect(precheck(def({ profiles: ['default'] }), env())).toBeNull();
  });
  it('reports NOT_CONFIGURED requirements', () => {
    const e = env({ requirementStatus: r => ({ ok: r !== 'firebase', reason: 'Firebase missing' }) });
    expect(precheck(def({ requires: ['firebase'] }), e)).toBe('NOT_CONFIGURED: Firebase missing');
  });
  it('blocks dangerous tests unless allowed AND confirmed', () => {
    const d = def({ dangerous: true, risk: 'DESTRUCTIVE' });
    expect(precheck(d, env({ dangerousAllowed: false }), { dangerConfirmed: true })).toMatch(/disabled in this build/);
    expect(precheck(d, env())).toMatch(/requires explicit confirmation/);
    expect(precheck(d, env(), { dangerConfirmed: true })).toBeNull();
  });
});

describe('grading', () => {
  it('never grades a DASHBOARD test VERIFIED from a local pass', () => {
    expect(gradePass(def({ verification: 'DASHBOARD' }), undefined)).toBe('LOCAL_PASS');
    expect(gradePass(def({ verification: 'LOCAL_ONLY' }), undefined)).toBe('VERIFIED');
    expect(gradePass(def({ verification: 'MANUAL' }), undefined)).toBe('MANUAL_VERIFICATION_REQUIRED');
    expect(gradePass(def(), { kind: 'SKIPPED' })).toBe('SKIPPED');
    expect(gradePass(def(), { kind: 'FAIL' })).toBe('FAIL');
  });
});

describe('runTest', () => {
  it('records timestamps, duration, output and testRunId', async () => {
    const store = new ResultsStore();
    const r = await runTest(def({ run: async () => ({ output: { a: 1 } }) }), store, env(), 'tr_x');
    expect(r).toMatchObject({ status: 'LOCAL_PASS', testRunId: 'tr_x', actual: { a: 1 } });
    expect(r.startedAt && r.finishedAt).toBeTruthy();
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('maps assertion failures to FAIL with the message', async () => {
    const store = new ResultsStore();
    const r = await runTest(def({ run: async ctx => ctx.expect(false, 'boom') }), store, env(), 'tr');
    expect(r.status).toBe('FAIL');
    expect(r.note).toBe('Assertion failed: boom');
  });
  it('maps unexpected throws to FAIL and keeps the error', async () => {
    const r = await runTest(def({ run: async () => { throw new TypeError('bad'); } }), new ResultsStore(), env(), 'tr');
    expect(r.status).toBe('FAIL');
    expect(r.error).toMatchObject({ name: 'TypeError', message: 'bad' });
  });
  it('maps SkipError to SKIPPED', async () => {
    const r = await runTest(def({ run: async () => { throw new SkipError('NOT_CONFIGURED: x'); } }), new ResultsStore(), env(), 'tr');
    expect(r).toMatchObject({ status: 'SKIPPED', note: 'NOT_CONFIGURED: x' });
  });
  it('times out hung tests', async () => {
    const r = await runTest(def({ timeoutMs: 20, run: () => new Promise(() => undefined) }), new ResultsStore(), env(), 'tr');
    expect(r.status).toBe('FAIL');
    expect(r.note).toMatch(/timed out/);
  });
  it('captures live logs', async () => {
    const store = new ResultsStore();
    const r = await runTest(def({ run: async ctx => { ctx.log('hello'); } }), store, env(), 'tr');
    expect(r.logs.join('\n')).toMatch(/hello/);
  });
});

describe('safe suite', () => {
  it('excludes dangerous, interactive and high-risk tests', async () => {
    expect(isSafeSuiteTest(def())).toBe(true);
    expect(isSafeSuiteTest(def({ dangerous: true }))).toBe(false);
    expect(isSafeSuiteTest(def({ interactive: true }))).toBe(false);
    expect(isSafeSuiteTest(def({ risk: 'HIGH' }))).toBe(false);
    const ran: string[] = [];
    const defs = [def({ id: 'A', run: async () => { ran.push('A'); } }), def({ id: 'B', dangerous: true, run: async () => { ran.push('B'); } })];
    await runSuite(defs, new ResultsStore(), env(), 'tr');
    expect(ran).toEqual(['A']);
  });
  it('can be cancelled between tests', async () => {
    const ran: string[] = [];
    const defs = ['A', 'B', 'C'].map(id => def({ id, run: async () => { ran.push(id); } }));
    await runSuite(defs, new ResultsStore(), env(), 'tr', undefined, () => ran.length >= 1);
    expect(ran).toEqual(['A']);
  });
});

describe('ResultsStore', () => {
  it('turns a RUNNING result from a dead process into MANUAL on hydrate', async () => {
    const store = new ResultsStore({
      load: async () => ({ 'ERR-012': { testId: 'ERR-012', testRunId: 't', status: 'RUNNING', logs: [], platform: 'android', profileId: 'default' } }),
      save: async () => undefined,
    });
    await store.hydrate();
    expect(store.status('ERR-012')).toBe('MANUAL_VERIFICATION_REQUIRED');
  });
  it('counts, verifies and resets', async () => {
    const store = new ResultsStore();
    await runTest(def({ id: 'X' }), store, env(), 'tr');
    expect(store.counts(['X', 'Y'])).toMatchObject({ LOCAL_PASS: 1, NOT_RUN: 1 });
    store.markVerified('X', 'tester');
    expect(store.get('X')).toMatchObject({ status: 'VERIFIED', verifiedBy: 'tester' });
    store.reset();
    expect(store.all()).toEqual([]);
  });
});
