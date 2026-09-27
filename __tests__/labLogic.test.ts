import { validateEnv, looksLikeServerSecret, maskKey } from '../src/config/envValidation';
import { buildReport, redactForExport } from '../src/testRunner/report';
import { EgressObserver } from '../src/services/egressObserver';
import { newTestRunId, fakeUserId, uuidV4 } from '../src/utils/ids';
import { safeJson } from '../src/utils/safe';
import { PROFILES, getProfile, disabledFeatures, baseConfig } from '../src/config/profiles';
import type { TestDefinition } from '../src/testRunner/types';

describe('env validation', () => {
  const good = { SCALEBUN_APP_ID: 'app_1', SCALEBUN_CLIENT_KEY: 'skb_test_ck_abcdef123456', NETWORK_TEST_SERVER_URL: 'http://10.0.2.2:4545/' };

  it('accepts a client key and normalizes the server URL', () => {
    const e = validateEnv(good, { isDev: true });
    expect(e.saasCredentials).toBe('CONFIGURED');
    expect(e.networkServerUrl).toBe('http://10.0.2.2:4545');
    expect(e.otaChannel).toBe('sdk-test');
  });

  it.each(['skb_live_sk_123456789', 'scalebun_pat_abcdefgh', 'my_secret_value', '-----BEGIN PRIVATE KEY-----\nabc'])('rejects server secret %s', v => {
    expect(looksLikeServerSecret(v)).toBe(true);
    const e = validateEnv({ ...good, SCALEBUN_CLIENT_KEY: v }, { isDev: true });
    expect(e.saasCredentials).toBe('REJECTED');
    expect(e.clientKey).toBeUndefined();
    expect(e.problems.join(' ')).not.toContain(v);
  });

  it('treats placeholders as NOT_CONFIGURED', () => {
    const e = validateEnv({ SCALEBUN_CLIENT_KEY: 'your_client_key', SCALEBUN_APP_ID: '' }, { isDev: true });
    expect(e.saasCredentials).toBe('NOT_CONFIGURED');
    expect(e.problems.some(p => p.includes('No usable ScaleBun credentials'))).toBe(true);
  });

  it('disables dangerous tests in release unless explicitly enabled', () => {
    expect(validateEnv(good, { isDev: false }).dangerousTestsAllowed).toBe(false);
    expect(validateEnv({ ...good, ENABLE_DANGEROUS_TESTS: 'true' }, { isDev: false }).dangerousTestsAllowed).toBe(true);
    expect(validateEnv(good, { isDev: true }).dangerousTestsAllowed).toBe(true);
  });

  it('masks keys for display', () => {
    expect(maskKey('skb_test_ck_abcdef123456')).toBe('skb_test_ck_…');
    expect(maskKey(undefined)).toBe('—');
  });
});

describe('report export', () => {
  const d: TestDefinition = {
    id: 'A-1', category: 'Analytics', name: 'n', description: 'd', risk: 'SAFE', platforms: ['android'], platformNote: 'x', preconditions: [],
    expectedLocal: 'l', expectedScaleBun: 's', dashboardLocation: 'x', covers: [], verification: 'DASHBOARD', run: async () => undefined,
  };

  it('never contains the client key or secret-like values', () => {
    const report = buildReport(
      'tr_1',
      [d],
      [{ testId: 'A-1', testRunId: 'tr_1', status: 'LOCAL_PASS', logs: [], platform: 'android', profileId: 'default', actual: { token: 'scalebun_pat_zzzzzzzz', nested: { clientKey: 'skb_test_ck_abcdef123456' } } }],
      { sdkVersion: '2.4.0', reactNativeVersion: '0.81.6', platform: 'android', osVersion: '15', appVersion: '0.0.1', buildNumber: '1', environment: 'development', clientKey: 'skb_test_ck_abcdef123456', profileId: 'default', integration: 'provider', configSnapshot: { clientKey: 'skb_test_ck_abcdef123456', appId: 'app_1' } },
    );
    const json = JSON.stringify(report);
    expect(json).not.toContain('skb_test_ck_abcdef123456');
    expect(json).not.toContain('scalebun_pat_zzzzzzzz');
    expect(report.environment.clientKeyPrefix).toBe('skb_test_ck_…');
    expect(report.summary).toEqual({ LOCAL_PASS: 1 });
    expect(report.environment.sdkVersion).toBe('2.4.0');
  });

  it('redactForExport handles nesting and non-string values', () => {
    expect(redactForExport({ a: [{ password: 'hunter2hunter2' }], n: 5 })).toEqual({ a: [{ password: '[REDACTED]' }], n: 5 });
  });
});

describe('egress observer (pass-through)', () => {
  function fakeTarget(status = 200) {
    const calls: Array<{ url: unknown; init?: RequestInit }> = [];
    const target: { fetch?: typeof fetch } = {
      fetch: (async (url: unknown, init?: RequestInit) => {
        calls.push({ url, init });
        return { status, ok: status < 400 } as Response;
      }) as unknown as typeof fetch,
    };
    return { target, calls };
  }

  it('passes requests through unchanged and records metadata only', async () => {
    const o = new EgressObserver();
    const { target, calls } = fakeTarget();
    o.install(target);
    const body = JSON.stringify({ secret: 'FAKE_SECRET_VALUE_123' });
    const res = await target.fetch!('https://api.scalebun.com/api/v1/batch?x=1', { method: 'POST', body, headers: { 'x-scalebun-client-key': 'k' } });
    expect(res.status).toBe(200);
    expect(calls[0].init?.body).toBe(body);
    const rec = o.all()[0];
    expect(rec).toMatchObject({ host: 'api.scalebun.com', path: '/api/v1/batch', sdk: true, method: 'POST', status: 200, bodyScan: 'scanned' });
    expect(JSON.stringify(o.all())).not.toContain('FAKE_SECRET_VALUE_123');
    expect(JSON.stringify(o.all())).not.toContain('x=1');
  });

  it('finds needles only in SDK-bound requests', async () => {
    const o = new EgressObserver();
    const { target } = fakeTarget();
    o.install(target);
    o.addNeedle('n', 'FAKE_AUTH_TOKEN_abc123');
    await target.fetch!('http://10.0.2.2:4545/echo', { headers: { Authorization: 'Bearer FAKE_AUTH_TOKEN_abc123' }, body: 'FAKE_AUTH_TOKEN_abc123' });
    expect(o.needleResult('n')!.hits).toBe(0);
    await target.fetch!('https://api.scalebun.com/api/v1/ingestion/x', { method: 'POST', body: '{"h":"FAKE_AUTH_TOKEN_abc123"}' });
    expect(o.needleResult('n')).toEqual({ hits: 1, hitPaths: ['/api/v1/ingestion/x'] });
  });

  it('propagates network errors and still records them', async () => {
    const o = new EgressObserver();
    const target = { fetch: (async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch };
    o.install(target);
    await expect(target.fetch('https://api.scalebun.com/api/v1/batch')).rejects.toThrow('Network request failed');
    expect(o.all()[0].error).toBe('Network request failed');
  });

  it('rejects needles too short to be unambiguous', () => {
    expect(() => new EgressObserver().addNeedle('x', 'abc')).toThrow();
  });
});

describe('ids & profiles', () => {
  it('testRunId is sortable and unique', () => {
    const a = newTestRunId(new Date('2026-09-27T16:15:30Z'));
    expect(a).toMatch(/^tr_20260927T161530Z_[0-9a-f]{8}$/);
    const many = new Set(Array.from({ length: 500 }, () => newTestRunId()));
    expect(many.size).toBe(500);
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('fake user ids are opaque, never emails', () => {
    expect(fakeUserId('tr_x', 'a')).toBe('sdk_test_user_a_tr_x');
    expect(fakeUserId('tr_x', 'a')).not.toContain('@');
  });
  it('profiles have unique ids and build client-safe configs', () => {
    expect(new Set(PROFILES.map(p => p.id)).size).toBe(PROFILES.length);
    const env = validateEnv({ SCALEBUN_APP_ID: 'app', SCALEBUN_CLIENT_KEY: 'skb_test_ck_abc123456789' }, { isDev: true });
    for (const p of PROFILES) {
      const cfg = JSON.stringify(p.build(env, { features: { replay: false }, privacy: {} }));
      expect(looksLikeServerSecret(cfg)).toBe(false);
    }
    expect(getProfile('nope').id).toBe('default');
    expect(disabledFeatures(getProfile('no-network'))).toEqual(['network']);
    expect(disabledFeatures(getProfile('custom'), { features: { replay: false, session: false }, privacy: {} })).toEqual(['replay', 'session']);
    expect(baseConfig(env)).not.toHaveProperty('projectId');
  });
  it('safeJson survives cycles and bigint', () => {
    const o: Record<string, unknown> = { b: BigInt(1) };
    o.self = o;
    expect(safeJson(o, 0)).toBe('{"b":"1n","self":"[circular]"}');
  });
});
